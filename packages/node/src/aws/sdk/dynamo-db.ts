import {
	DynamoDBClient,
	DynamoDBClientConfig,
	ReturnConsumedCapacity,
} from '@aws-sdk/client-dynamodb';
import {
	BatchGetCommand,
	BatchGetCommandInput,
	BatchGetCommandOutput,
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	QueryCommandInput,
	QueryCommandOutput,
	TranslateConfig,
	UpdateCommand,
	UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { object, ZodObject } from 'zod/v4';
import { $ZodIssue, ParseContext } from 'zod/v4/core';

import { CustomException } from '@incloodsolutions/toolkit/error';
import {
	IBaseEnableDebug,
	ObjectType,
} from '@incloodsolutions/toolkit/interface';
import {
	consoleLog,
	generateCustomUUID,
	generateDateInNumber,
	generateISODate,
} from '@incloodsolutions/toolkit/utility';

/**
 * Every field optional, for validating partial updates. Zod refuses `.partial()` on a schema that
 * has refinements (`.refine`/`.superRefine`), so this rebuilds the object from its shape instead.
 * The refinements are dropped -- they describe a whole item and can't be judged on a partial one.
 */
function toPartialSchema(schema: ZodObject): ZodObject {
	return object(schema.shape).partial();
}

/**
 * Creates a lightweight CRUD wrapper around a single DynamoDB table, built on
 * the AWS SDK v3 `DynamoDBDocumentClient`.
 *
 * Takes care of the repetitive parts of talking to DynamoDB directly:
 * - Generates the partition key and stamps `createdAtDate` on `put`.
 * - Validates `put`/`updateOne` payloads against a Zod schema via
 *   the wrapper's `validate` before any write reaches DynamoDB.
 * - Escapes attribute names that collide with DynamoDB reserved words in
 *   every generated key condition, filter, and update expression.
 * - Supports `contains`-based text search and attribute projection
 *   (`select`) in `query`.
 * - Transparently follows pagination in `query` (while `returnAll` is
 *   set) and in `getMany`.
 * - Optionally logs every command's input and consumed capacity via
 *   `consoleLog` when `options.options.enableDebug` is `true`.
 *
 * @template TType - Shape of one item in the table.
 * @template TTableIndexType - Union of the table's secondary index names,
 *   used to type `query`'s `indexName` parameter.
 * @param options - Wrapper configuration.
 * @param options.tableName - The DynamoDB table name.
 * @param options.schema - Zod object schema describing the item shape.
 *   `put` validates `data` against the full `schema`; `updateOne`
 *   validates against `schema.partial()` .
 * @param options.compositePrimaryKeyOptions - Controls how the partition key
 *   is generated when creating a new item via `put`.
 * @param options.config - `DynamoDBClientConfig` passed straight through to
 *   the underlying `DynamoDBClient` (region, credentials, endpoint, etc.).
 * @param options.validationOptions - Reserved for future validation
 *   configuration; not currently read by any method.
 * @param options.translationConfig - `TranslateConfig` passed to
 *   `DynamoDBDocumentClient.from` (e.g. `marshallOptions`/`unmarshallOptions`,
 *   such as `removeUndefinedValues`). `marshallOptions.removeUndefinedValues`
 *   defaults to `true` so optional fields left `undefined` don't throw; pass
 *   `false` explicitly to restore the strict behaviour.
 * @param options.options - Wrapper-wide runtime options (debug logging, etc.).
 *
 * @returns An object exposing `put`, `query`, `getOne`, `getMany`,
 *   `updateOne`, `incrementOne` (an atomic counter), and `delete`, each
 *   scoped to `options.tableName`.
 */
export function initDynamoDbClientWrapper<
	TType extends ObjectType = any,
	TTableIndexType = string,
>(options: {
	/** Dynamo-db table name */
	readonly tableName: string;
	/** Zod object schema describing the item shape. */
	readonly schema: ZodObject;
	/** Options for primary and sort keys */
	readonly compositePrimaryKeyOptions?: {
		/** Dynamo-db primary key (partition key) attribute name. @default 'id' */
		readonly primaryKeyName?: string;
		/**
		 * Dynamo-db sort key attribute name, if the table has one. Informational
		 * only — no method in this wrapper currently generates or reads a sort
		 * key value from it; callers must still supply the sort key themselves
		 * wherever a `key`/`conditions` object needs one.
		 * @default undefined
		 */
		readonly sortKeyName?: string;
		/**
		 * How to generate the partition key's value on `put`:
		 * - `'uuid'` — a plain v7 UUID (`generateCustomUUID()`).
		 * - `'epochTimestamp'` — `Date.now()` as a string, e.g. `'1718000000000'`.
		 * - `'timestampUuid'` (default) — a compact numeric date prefix plus a
		 *   v7 UUID, e.g. `'20240412010255666-<uuid>'` (`generateDateInNumber()`
		 *   + `generateCustomUUID()`). Sorts lexicographically by creation time.
		 * - `'none'` — skips key generation entirely, so the caller must already
		 *   have the partition key set on `data` before calling `put`.
		 * @default timestampUuid
		 */
		readonly primaryKeyIdType?:
			'uuid' | 'timestampUuid' | 'epochTimestamp' | 'none';
	};
	/** Dynamo-db client configuration, forwarded to `new DynamoDBClient(...)`. */
	readonly config?: DynamoDBClientConfig;
	/**
	 * Validation options.
	 * @remarks Currently unused — `put` always validates against the full
	 * `schema`, and `updateOne` always validates against `schema.partial()`.
	 */
	readonly validationOptions?: ParseContext<$ZodIssue>;
	/**
	 * Dynamo-db object translation options, forwarded to
	 * `DynamoDBDocumentClient.from(client, translationConfig)`.
	 */
	readonly translationConfig?: TranslateConfig;
	readonly options?: {
		/** Reserved; not currently read by any method on the returned wrapper. */
		readonly timestamp?: boolean;
		/**
		 * Prefix included in every debug log line (alongside the command name),
		 * so logs from multiple wrapper instances can be told apart. Only has an
		 * effect when `enableDebug` is `true`.
		 */
		readonly debugContext?: string;
		// `enableDebug` (from `IBaseEnableDebug`, below): logs every command's
		// input, and on success its consumed capacity, via `consoleLog`.
		// Defaults to `false`.
	} & Readonly<Partial<IBaseEnableDebug>>;
}) {
	/**
	 * DynamoDB's full list of ~573 reserved words (lower-cased), per
	 * {@link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html | the AWS docs}.
	 * Any attribute name that collides with one of these is rewritten to an
	 * expression-attribute-name placeholder (e.g. `name` → `#name_`) wherever it
	 * appears in `query` and `updateOne`, since DynamoDB rejects reserved words
	 * used literally in expressions. Matching is case-insensitive (`data` is
	 * compared lower-cased against this list).
	 */
	const AWS_DYNAMODB_RESERVED_WORDS = [
		'abort',
		'absolute',
		'action',
		'add',
		'after',
		'agent',
		'aggregate',
		'all',
		'allocate',
		'alter',
		'analyze',
		'and',
		'any',
		'archive',
		'are',
		'array',
		'as',
		'asc',
		'ascii',
		'asensitive',
		'assertion',
		'asymmetric',
		'at',
		'atomic',
		'attach',
		'attribute',
		'auth',
		'authorization',
		'authorize',
		'auto',
		'avg',
		'back',
		'backup',
		'base',
		'batch',
		'before',
		'begin',
		'between',
		'bigint',
		'binary',
		'bit',
		'blob',
		'block',
		'boolean',
		'both',
		'breadth',
		'bucket',
		'bulk',
		'by',
		'byte',
		'call',
		'called',
		'calling',
		'capacity',
		'cascade',
		'cascaded',
		'case',
		'cast',
		'catalog',
		'char',
		'character',
		'check',
		'class',
		'clob',
		'close',
		'cluster',
		'clustered',
		'clustering',
		'clusters',
		'coalesce',
		'collate',
		'collation',
		'collection',
		'column',
		'columns',
		'combine',
		'comment',
		'commit',
		'compact',
		'compile',
		'compress',
		'condition',
		'conflict',
		'connect',
		'connection',
		'consistency',
		'consistent',
		'constraint',
		'constraints',
		'constructor',
		'consumed',
		'continue',
		'convert',
		'copy',
		'corresponding',
		'count',
		'counter',
		'create',
		'cross',
		'cube',
		'current',
		'cursor',
		'cycle',
		'data',
		'database',
		'date',
		'datetime',
		'day',
		'deallocate',
		'dec',
		'decimal',
		'declare',
		'default',
		'deferrable',
		'deferred',
		'define',
		'defined',
		'definition',
		'delete',
		'delimited',
		'depth',
		'deref',
		'desc',
		'describe',
		'descriptor',
		'detach',
		'deterministic',
		'diagnostics',
		'directories',
		'disable',
		'disconnect',
		'distinct',
		'distribute',
		'do',
		'domain',
		'double',
		'drop',
		'dump',
		'duration',
		'dynamic',
		'each',
		'element',
		'else',
		'elseif',
		'empty',
		'enable',
		'end',
		'equal',
		'equals',
		'error',
		'escape',
		'escaped',
		'eval',
		'evaluate',
		'exceeded',
		'except',
		'exception',
		'exceptions',
		'exclusive',
		'exec',
		'execute',
		'exists',
		'exit',
		'explain',
		'explode',
		'export',
		'expression',
		'extended',
		'external',
		'extract',
		'fail',
		'false',
		'family',
		'fetch',
		'fields',
		'file',
		'filter',
		'filtering',
		'final',
		'finish',
		'first',
		'fixed',
		'flattern',
		'float',
		'for',
		'force',
		'foreign',
		'format',
		'forward',
		'found',
		'free',
		'from',
		'full',
		'function',
		'functions',
		'general',
		'generate',
		'get',
		'glob',
		'global',
		'go',
		'goto',
		'grant',
		'greater',
		'group',
		'grouping',
		'handler',
		'hash',
		'have',
		'having',
		'heap',
		'hidden',
		'hold',
		'hour',
		'identified',
		'identity',
		'if',
		'ignore',
		'immediate',
		'import',
		'in',
		'including',
		'inclusive',
		'increment',
		'incremental',
		'index',
		'indexed',
		'indexes',
		'indicator',
		'infinite',
		'initially',
		'inline',
		'inner',
		'innter',
		'inout',
		'input',
		'insensitive',
		'insert',
		'instead',
		'int',
		'integer',
		'intersect',
		'interval',
		'into',
		'invalidate',
		'is',
		'isolation',
		'item',
		'items',
		'iterate',
		'join',
		'key',
		'keys',
		'lag',
		'language',
		'large',
		'last',
		'lateral',
		'lead',
		'leading',
		'leave',
		'left',
		'length',
		'less',
		'level',
		'like',
		'limit',
		'limited',
		'lines',
		'list',
		'load',
		'local',
		'localtime',
		'localtimestamp',
		'location',
		'locator',
		'lock',
		'locks',
		'log',
		'loged',
		'long',
		'loop',
		'lower',
		'map',
		'match',
		'materialized',
		'max',
		'maxlen',
		'member',
		'merge',
		'method',
		'metrics',
		'min',
		'minus',
		'minute',
		'missing',
		'mod',
		'mode',
		'modifies',
		'modify',
		'module',
		'month',
		'multi',
		'multiset',
		'name',
		'names',
		'national',
		'natural',
		'nchar',
		'nclob',
		'new',
		'next',
		'no',
		'none',
		'not',
		'null',
		'nullif',
		'number',
		'numeric',
		'object',
		'of',
		'offline',
		'offset',
		'old',
		'on',
		'online',
		'only',
		'opaque',
		'open',
		'operator',
		'option',
		'or',
		'order',
		'ordinality',
		'other',
		'others',
		'out',
		'outer',
		'output',
		'over',
		'overlaps',
		'override',
		'owner',
		'pad',
		'parallel',
		'parameter',
		'parameters',
		'partial',
		'partition',
		'partitioned',
		'partitions',
		'path',
		'percent',
		'percentile',
		'permission',
		'permissions',
		'pipe',
		'pipelined',
		'plan',
		'pool',
		'position',
		'precision',
		'prepare',
		'preserve',
		'primary',
		'prior',
		'private',
		'privileges',
		'procedure',
		'processed',
		'project',
		'projection',
		'property',
		'provisioning',
		'public',
		'put',
		'query',
		'quit',
		'quorum',
		'raise',
		'random',
		'range',
		'rank',
		'raw',
		'read',
		'reads',
		'real',
		'rebuild',
		'record',
		'recursive',
		'reduce',
		'ref',
		'reference',
		'references',
		'referencing',
		'regexp',
		'region',
		'reindex',
		'relative',
		'release',
		'remainder',
		'rename',
		'repeat',
		'replace',
		'request',
		'reset',
		'resignal',
		'resource',
		'response',
		'restore',
		'restrict',
		'result',
		'return',
		'returning',
		'returns',
		'reverse',
		'revoke',
		'right',
		'role',
		'roles',
		'rollback',
		'rollup',
		'routine',
		'row',
		'rows',
		'rule',
		'rules',
		'sample',
		'satisfies',
		'save',
		'savepoint',
		'scan',
		'schema',
		'scope',
		'scroll',
		'search',
		'second',
		'section',
		'segment',
		'segments',
		'select',
		'self',
		'semi',
		'sensitive',
		'separate',
		'sequence',
		'serializable',
		'session',
		'set',
		'sets',
		'shard',
		'share',
		'shared',
		'short',
		'show',
		'signal',
		'similar',
		'size',
		'skewed',
		'smallint',
		'snapshot',
		'some',
		'source',
		'space',
		'spaces',
		'sparse',
		'specific',
		'specifictype',
		'split',
		'sql',
		'sqlcode',
		'sqlerror',
		'sqlexception',
		'sqlstate',
		'sqlwarning',
		'start',
		'state',
		'static',
		'status',
		'storage',
		'store',
		'stored',
		'stream',
		'string',
		'struct',
		'style',
		'sub',
		'submultiset',
		'subpartition',
		'substring',
		'subtype',
		'sum',
		'super',
		'symmetric',
		'synonym',
		'system',
		'table',
		'tablesample',
		'temp',
		'temporary',
		'terminated',
		'text',
		'than',
		'then',
		'throughput',
		'time',
		'timestamp',
		'timezone',
		'tinyint',
		'to',
		'token',
		'total',
		'touch',
		'trailing',
		'transaction',
		'transform',
		'translate',
		'translation',
		'treat',
		'trigger',
		'trim',
		'true',
		'truncate',
		'ttl',
		'tuple',
		'type',
		'under',
		'undo',
		'union',
		'unique',
		'unit',
		'unknown',
		'unlogged',
		'unnest',
		'unprocessed',
		'unsigned',
		'until',
		'update',
		'upper',
		'url',
		'usage',
		'use',
		'user',
		'users',
		'using',
		'uuid',
		'vacuum',
		'value',
		'valued',
		'values',
		'varchar',
		'variable',
		'variance',
		'varint',
		'varying',
		'view',
		'views',
		'virtual',
		'void',
		'wait',
		'when',
		'whenever',
		'where',
		'while',
		'window',
		'with',
		'within',
		'without',
		'work',
		'wrapped',
		'write',
		'year',
		'zone',
	];

	/** Resolved partition key attribute name — `options.compositePrimaryKeyOptions.primaryKeyName`, or `'id'`. */
	const primaryKeyName =
		options?.compositePrimaryKeyOptions?.primaryKeyName || 'id';

	/**
	 * Resolved partition-key generation strategy — see
	 * `options.compositePrimaryKeyOptions.primaryKeyIdType`'s doc for what each
	 * value does. Defaults to `'timestampUuid'` when unset. Read by
	 * {@link mapSchemaPrimaryKey}.
	 */
	const primaryKeyIdType =
		options.compositePrimaryKeyOptions?.primaryKeyIdType || 'timestampUuid';

	/** Prefix prepended to every debug log line's context (see `options.options.debugContext`). */
	const debugContext = `${options?.options?.debugContext || ''} | DynamoDb Wrapper`;
	/** The underlying document client every method sends commands through. */
	const dynamoDbClientInstance = DynamoDBDocumentClient.from(
		new DynamoDBClient(options?.config),
		{
			...options?.translationConfig,
			marshallOptions: {
				removeUndefinedValues: true,
				...options?.translationConfig?.marshallOptions,
			},
		},
	);

	/**
	 * Stamps `createdAtDate` onto `data`, mutating it in place. Used by `put`
	 * before the item is validated and written, so every created item carries a
	 * creation timestamp. Leaves an existing `createdAtDate` value untouched.
	 * @param data The data object to modify.
	 * @returns `data`, for convenient chaining — it is mutated, not copied.
	 */
	function mapSchemaCreatedDate(data: Partial<TType>) {
		(data as any)['createdAtDate'] = data?.createdAtDate || generateISODate();
		return data;
	}

	/**
	 * Stamps `modifiedAtDate` onto `data`, mutating it in place, the same way
	 * {@link mapSchemaCreatedDate} stamps `createdAtDate`. Intended to be called
	 * from `updateOne` before validation, so every update expression also sets
	 * a last-modified timestamp.
	 *
	 * @remarks Currently **disabled** (commented out) and not called from
	 * `updateOne` — updates do not stamp `modifiedAtDate` at the moment.
	 *
	 * @param data The data object to modify.
	 * @returns `data`, for convenient chaining — it is mutated, not copied.
	 */
	// function mapSchemaModifiedDate(data: Partial<TType>) {
	// 	(data as any)['modifiedAtDate'] = data?.modifiedAtDate || generateISODate();
	// 	return data;
	// }

	/**
	 * Generates the partition key value for a new item and sets it on `data`,
	 * mutating it in place — unless `compositePrimaryKeyOptions.primaryKeyIdType`
	 * is `'none'`, in which case `data` is returned untouched. See
	 * `compositePrimaryKeyOptions.primaryKeyIdType` for the generated formats.
	 * Used by `put`, before {@link mapSchemaCreatedDate} and validation.
	 * @param data The data object to modify.
	 * @returns `data`, for convenient chaining — it is mutated, not copied.
	 */
	function mapSchemaPrimaryKey(data: Partial<TType>) {
		if (primaryKeyIdType === 'uuid') {
			(data as any)[primaryKeyName] = generateCustomUUID();
		} else if (primaryKeyIdType === 'epochTimestamp') {
			(data as any)[primaryKeyName] = `${Date.now()}`;
		} else if (primaryKeyIdType === 'timestampUuid') {
			(data as any)[primaryKeyName] =
				`${generateDateInNumber()}-${generateCustomUUID()}`;
		} else if (primaryKeyIdType === 'none') {
			// Do nothing — the caller is expected to provide the partition key
		}
		return data;
	}

	/**
	 * Validates `data` against `options.schema`, closed over this wrapper's
	 * `options.schema` and `options.options.enableDebug` — callers only need to
	 * supply `data` (and, for partial updates, `skipMissingProperties`).
	 *
	 * @param data The data to validate against `options.schema`.
	 * @param config.skipMissingProperties Validates against
	 *   `options.schema.partial()` instead (every field optional) — use for
	 *   partial updates where `data` is not expected to carry every field.
	 *   Defaults to `false`.
	 * @throws {CustomException} Thrown with the flattened issue messages when
	 *   validation fails.
	 * @returns The parsed, validated data.
	 */
	async function validate(
		data: Partial<TType>,
		config?: { skipMissingProperties?: boolean },
	): Promise<Partial<TType>> {
		const enableDebug = options?.options?.enableDebug;
		const resolvedSchema: ZodObject = config?.skipMissingProperties
			? toPartialSchema(options.schema)
			: options.schema;

		if (enableDebug) {
			consoleLog({
				context: validate.name,
				message: config?.skipMissingProperties
					? 'Validating against schema.partial()'
					: 'Validating against schema',
				data,
			});
		}

		const validationResult = await resolvedSchema.safeParseAsync(data);

		if (!validationResult.success) {
			const errorMessages = validationResult.error.issues.map((issue) => {
				const path = issue.path.join('.');
				return `${path ? `${path}: ` : ''}${issue.message}`;
			});
			if (enableDebug) {
				consoleLog({
					context: validate.name,
					message: 'Validation failed',
					data: errorMessages,
				});
			}
			throw new CustomException(errorMessages);
		}

		if (enableDebug) {
			consoleLog({
				context: validate.name,
				message: 'Validation succeeded',
				data: validationResult.data,
			});
		}

		return validationResult.data as Partial<TType>;
	}

	return {
		/**
		 * Creates a new item in the DynamoDB table (`PutCommand`).
		 *
		 * Mutates and writes `data` as follows, in order:
		 * 1. {@link mapSchemaPrimaryKey} generates the partition key (unless
		 *    `primaryKeyIdType: 'none'` is set).
		 * 2. {@link mapSchemaCreatedDate} stamps `createdAtDate`.
		 * 3. The result is validated against `options.schema` via
		 *    `validate` — throws {@link CustomException} and never
		 *    calls DynamoDB if validation fails.
		 * 4. The validated (parsed) item is written. Zod drops keys the schema
		 *    does not declare, so the partition key and `createdAtDate` are put
		 *    back if the schema did not declare them. Other undeclared keys are
		 *    dropped.
		 *
		 * @param data The item to insert. Does not need the partition key or
		 *   `createdAtDate` set — both are generated/stamped here.
		 * @returns The item that was written: the validated data plus the
		 *   partition key and `createdAtDate` (not a fresh read-back).
		 */
		put: async ({ data }: { data: Partial<TType> }) => {
			mapSchemaPrimaryKey(data);
			mapSchemaCreatedDate(data);

			const dataDto = await validate(data);

			const item: Partial<TType> = { ...dataDto };
			for (const systemField of [primaryKeyName, 'createdAtDate']) {
				if (
					item[systemField] === undefined &&
					data[systemField] !== undefined
				) {
					(item as any)[systemField] = data[systemField];
				}
			}

			const { ConsumedCapacity } = await dynamoDbClientInstance.send(
				new PutCommand({
					Item: item,
					TableName: options.tableName,
					ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				}),
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} PutCommand`,
					message: 'successful',
					data: { consumedCapacity: ConsumedCapacity?.CapacityUnits },
				});
			}

			return item as TType;
		},

		/**
		 * Queries items from the DynamoDB table (`QueryCommand`), optionally
		 * following pagination until every matching page has been fetched.
		 *
		 * Builds the command in this order, each step logged (when
		 * `enableDebug`) right after it is applied:
		 * 1. `conditions` → `KeyConditionExpression` (equality on the partition
		 *    key / index key — this is a `Query`, not a `Scan`).
		 * 2. `searchTerms` → a `contains(...)` `FilterExpression` OR-ed across
		 *    every listed property (the literal `'password'` property is always
		 *    excluded from search, even if listed).
		 * 3. `filter` → additional equality conditions AND-ed onto the same
		 *    `FilterExpression`.
		 *
		 * Any attribute name colliding with a DynamoDB reserved word (see
		 * `AWS_DYNAMODB_RESERVED_WORDS`) is automatically rewritten to an
		 * `ExpressionAttributeNames` placeholder in all three steps.
		 *
		 * @param filter Additional equality filter conditions, applied via
		 *   `FilterExpression` (post-query filtering — does not reduce RCU cost).
		 * @param conditions Key conditions for the query (`KeyConditionExpression`);
		 *   typically the partition key, and the sort key when narrowing further.
		 * @param indexName Secondary index to query instead of the base table.
		 * @param limit Maximum number of items to return per DynamoDB page
		 *   (`Limit`). Independent of `returnAll` — with `returnAll: true` this
		 *   only bounds each underlying page, not the total result size.
		 * @param returnAll When `true`, keeps querying subsequent pages
		 *   (`ExclusiveStartKey`/`LastEvaluatedKey`) until DynamoDB reports no
		 *   more results. When `false` (default), returns after a single page.
		 * @param paginationData A previous call's `nextPageToken`, to resume
		 *   from where that call left off.
		 * @param searchTerms Case-sensitive `contains` text search across the
		 *   listed properties.
		 * @param searchTerms.properties Properties to search within.
		 * @param searchTerms.value The value every listed property is checked
		 *   for containment of.
		 * @param select Properties to include in each returned item
		 *   (`ProjectionExpression`). Omit to return every attribute.
		 * @returns `data` — every matched item across all fetched pages — and
		 *   `nextPageToken`, the last page's `LastEvaluatedKey` (`undefined` once
		 *   the result set is exhausted).
		 */
		query: async ({
			filter,
			conditions,
			indexName,
			limit,
			returnAll = false,
			paginationData,
			searchTerms,
			select = [],
		}: {
			conditions: Partial<TType>;
			filter: Partial<TType>;
			limit?: number;
			indexName?: TTableIndexType;
			returnAll?: boolean;
			paginationData?: Partial<TType>;
			select?: (keyof TType)[];
			searchTerms?: {
				properties: (keyof TType)[];
				value: string | number | boolean;
			};
		}) => {
			let exclusiveStartKey: TType;
			let queryResponse: QueryCommandOutput;
			let responseData: TType[] = [];
			let consumedCapacity = 0;

			const queryParam: QueryCommandInput = {
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
			};

			if (conditions && Object.keys(conditions).length) {
				Object.entries(conditions).map(([key, value]) => {
					const rawKey = key;
					const modifiedRawKey = `:${key}`;
					// first check if aws dynamoDB reserved key is present
					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(key).toLowerCase())) {
						key = `#${String(key)}`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[key]: rawKey,
						};
					}

					queryParam.KeyConditionExpression = queryParam?.KeyConditionExpression
						? (queryParam.KeyConditionExpression += ` AND ${key} = ${modifiedRawKey}`)
						: `${key} = ${modifiedRawKey}`;

					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value,
					};
				});
				if (options?.options?.enableDebug) {
					consoleLog({
						context: `${debugContext} QueryCommand`,
						message: 'KeyConditions applied',
						data: queryParam,
					});
				}
			}

			if (indexName) {
				queryParam.IndexName = indexName as string;
			}

			if (limit) {
				queryParam.Limit = limit;
			}

			if (select.length) {
				queryParam.ProjectionExpression = select.length
					? [...new Set(select)].toString()
					: undefined;
			}

			if (paginationData && Object.keys(paginationData).length) {
				queryParam.ExclusiveStartKey = paginationData;
			}

			// uses only contain operator cus is search
			if (searchTerms?.properties.length && searchTerms?.value) {
				const properties = [
					...new Set(
						searchTerms.properties.filter(
							(property) => property !== 'password',
						),
					),
				];

				properties.map((property, index) => {
					const rawProperty = property;
					// first check if aws dynamoDB reserved key is presence
					if (
						AWS_DYNAMODB_RESERVED_WORDS.includes(String(property).toLowerCase())
					) {
						property = `#${String(property)}_`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[property]: rawProperty as string,
						};
					}
					queryParam.FilterExpression =
						index === 0
							? `contains(${String(property)}, :searchKeyword)`
							: (queryParam.FilterExpression += ` OR contains(${String(property)}, :searchKeyword)`);
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						':searchKeyword': searchTerms.value,
					};
				});
				if (options?.options?.enableDebug) {
					consoleLog({
						context: `${debugContext} QueryCommand`,
						message: 'Applied search/filter',
						data: queryParam,
					});
				}
			}

			if (filter && Object.keys(filter).length) {
				Object.entries(filter).map(([key, value]) => {
					const rawKey = key;
					const modifiedRawKey = `:${key}`;

					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(key).toLowerCase())) {
						key = `#${String(key)}`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[key]: rawKey,
						};
					}

					const filterExpressionValue = `${key} = ${modifiedRawKey}`;

					if (queryParam.FilterExpression) {
						queryParam.FilterExpression += ` AND ${filterExpressionValue}`;
					} else {
						queryParam.FilterExpression = filterExpressionValue;
					}
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value,
					};
				});

				if (options?.options?.enableDebug) {
					consoleLog({
						context: `${debugContext} QueryCommand`,
						message: 'Applied FilterExpression',
						data: queryParam,
					});
				}
			}

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} QueryCommand`,
					message: 'Calling with',
					data: queryParam,
				});
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(
					new QueryCommand(queryParam),
				);
				responseData = [...responseData, ...(queryResponse.Items as TType[])];
				exclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				queryParam.ExclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				consumedCapacity =
					consumedCapacity + queryResponse.ConsumedCapacity?.CapacityUnits;
			} while (
				queryResponse.LastEvaluatedKey &&
				Object.keys(queryResponse.LastEvaluatedKey).length &&
				returnAll
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} QueryCommand`,
					message: 'successful',
					data: { consumedCapacity },
				});
			}

			return {
				data: responseData,
				nextPageToken: exclusiveStartKey,
			};
		},

		/**
		 * Retrieves a single item from the DynamoDB table by its key
		 * (`GetCommand`).
		 * @param key The item's primary key (and sort key, if the table has one).
		 * @param select Properties to include in the result (`ProjectionExpression`).
		 *   Omit to return every attribute.
		 * @returns The retrieved item, or `undefined` if no item has that key.
		 */
		getOne: async ({
			key,
			select = [],
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			select?: (keyof TType)[];
		}) => {
			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} GetCommand`,
					message: 'Calling with',
					data: key,
				});
			}

			const response = await dynamoDbClientInstance.send(
				new GetCommand({
					Key: key,
					ProjectionExpression: select.length
						? [...new Set(select)].toString()
						: undefined,
					TableName: options.tableName,
					ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				}),
			);
			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} GetCommand`,
					message: 'successful',
					data: { consumedCapacity: response.ConsumedCapacity?.CapacityUnits },
				});
			}
			return response.Item as TType;
		},

		/**
		 * Retrieves multiple items from the DynamoDB table by their keys
		 * (`BatchGetCommand`).
		 *
		 * Always follows `UnprocessedKeys` until DynamoDB has returned every
		 * requested item (or failed to find it) — unlike `query`, there is
		 * currently no way to fetch only a single page here.
		 *
		 * @param keys The items' primary keys (and sort keys, if the table has one).
		 *   Returns `{ data: [], nextPageData: undefined }` immediately if empty.
		 * @param select Properties to include in each result (`ProjectionExpression`).
		 *   Omit to return every attribute.
		 * @param returnAll Accepted for symmetry with `query`'s option of the same
		 *   name, but currently unused — this method always fetches every page
		 *   regardless of its value.
		 * @returns `data` — every retrieved item across all fetched pages — and
		 *   `nextPageData` (DynamoDB's `UnprocessedKeys`), which is always empty
		 *   by the time this resolves, since the method only returns once there
		 *   are no more unprocessed keys left to retry.
		 */
		getMany: async ({
			keys,
			select = [],
		}: {
			/** Array of primaryKey and sortKey only */
			keys: Partial<TType>[];
			select?: (keyof TType)[];
			returnAll?: boolean;
		}) => {
			let queryResponse: BatchGetCommandOutput;
			let responseData: TType[] = [];
			// Always overwritten before being read — the loop below is a `do-while`,
			// so it runs (and reassigns this) at least once before the value is used.
			let consumedCapacity: number;

			if (!keys || !keys.length) {
				return {
					data: [] as TType[],
					nextPageData: undefined,
				};
			}

			const batchGetInput: BatchGetCommandInput = {
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				RequestItems: {
					[options.tableName]: {
						Keys: keys,
						ProjectionExpression: select.length
							? [...new Set(select)].toString()
							: undefined,
					},
				},
			};

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} BatchGetCommand`,
					message: 'Calling with',
					data: batchGetInput,
				});
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(
					new BatchGetCommand(batchGetInput),
				);
				responseData = [
					...responseData,
					...(queryResponse.Responses[options?.tableName] as TType[]),
				];
				batchGetInput.RequestItems = queryResponse.UnprocessedKeys;
				consumedCapacity = queryResponse.ConsumedCapacity.reduce(
					(total, capacity) => total + capacity.CapacityUnits,
					0,
				);
			} while (
				queryResponse.UnprocessedKeys &&
				Object.keys(queryResponse.UnprocessedKeys).length
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} BatchGetCommand`,
					message: 'successful',
					data: { consumedCapacity },
				});
			}

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys,
			};
		},

		/**
		 * Updates a single item in the DynamoDB table (`UpdateCommand`), setting
		 * only the attributes present in `data` — every other attribute on the
		 * existing item is left untouched.
		 *
		 * `data` is validated against `options.schema.partial()` (every field
		 * optional) via `validate` before the `UpdateExpression` is
		 * built — throws {@link CustomException} and never calls DynamoDB if
		 * validation fails. Each key in `data` becomes one `SET` clause, with
		 * DynamoDB reserved words rewritten to `ExpressionAttributeNames`
		 * placeholders the same way `query` does.
		 *
		 * @param key The primary key (and sort key, if the table has one) of the
		 *   item to update.
		 * @param data The attributes to set. Does not need to (and need not)
		 *   include every field of `options.schema` — only the attributes
		 *   present here are updated.
		 * @returns The full updated item, as returned by DynamoDB
		 *   (`ReturnValues: 'ALL_NEW'`).
		 */
		updateOne: async ({
			key,
			data,
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			data: Partial<TType>;
		}) => {
			// mapSchemaModifiedDate(data);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand`,
					message: 'Validating data:',
					data,
				});
			}

			const dataDto = await validate(data, { skipMissingProperties: true });

			const updateParam: UpdateCommandInput = {
				Key: key,
				ReturnValues: 'ALL_NEW',
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
			};

			Object.entries(dataDto).map(([propertyKey, value]) => {
				const rawKey = propertyKey;
				// Value placeholder tokens (`:name`) are a separate namespace from
				// attribute-name placeholders (`#name`) and must never contain a
				// `#` — so this is derived from `rawKey`, before `propertyKey` is
				// possibly rewritten to its `#`-prefixed name placeholder below.
				const valuePlaceholder = `:${rawKey}`;
				if (AWS_DYNAMODB_RESERVED_WORDS.includes(propertyKey.toLowerCase())) {
					propertyKey = `#${propertyKey}_`;
					updateParam.ExpressionAttributeNames = {
						...updateParam.ExpressionAttributeNames,
						[propertyKey]: rawKey,
					};
				}
				const filterValue = `${propertyKey} = ${valuePlaceholder}`;
				if (updateParam.UpdateExpression) {
					updateParam.UpdateExpression += `, ${filterValue}`;
				} else {
					updateParam.UpdateExpression = `SET ${filterValue}`;
				}
				updateParam.ExpressionAttributeValues = {
					...updateParam.ExpressionAttributeValues,
					[valuePlaceholder]: value,
				};
			});

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand`,
					message: 'Calling with',
					data: updateParam,
				});
			}

			const response = await dynamoDbClientInstance.send(
				new UpdateCommand(updateParam),
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand`,
					message: 'successful',
					data: { consumedCapacity: response.ConsumedCapacity?.CapacityUnits },
				});
			}

			return response.Attributes as TType;
		},

		/**
		 * Atomically adds to a number attribute of one item (`UpdateCommand` with
		 * `SET field = if_not_exists(field, :startsAt) + :by`) and returns the
		 * number. The addition happens inside DynamoDB, not in the caller, so
		 * concurrent callers never receive the same value (a read followed by an
		 * `updateOne` is not safe). It suits any numeric counter: sequence numbers,
		 * stock levels, quotas, view or retry counts.
		 *
		 * The item is created when it does not exist yet, and the attribute is
		 * created when the item lacks it, both starting from `startsAt`. Nothing
		 * else about the item matters: any other attributes are left untouched.
		 *
		 * @param key The primary key (and sort key, if the table has one) of the
		 *   item holding the counter.
		 * @param field The number attribute to add to. A dotted path such as
		 *   `'counters.invoice'` reaches a number inside a map; the map itself must
		 *   already exist, DynamoDB cannot create it in the same update.
		 * @param by How much to add. Negative values count down. @default 1
		 * @param startsAt The value the attribute counts from when it does not
		 *   exist yet. @default 0
		 * @param returns Which value to resolve with: `'new'` is the value after
		 *   the addition (a first call on a counter that starts at 0 gives 1);
		 *   `'previous'` is the value before it (a first call on a counter that
		 *   starts at 1 gives 1, then 2 ...), for counters that store the number
		 *   the next caller should use. @default 'new'
		 * @param min The lowest value the attribute may reach. An addition that
		 *   would take it below is not applied, and throws.
		 * @param max The highest value the attribute may reach. An addition that
		 *   would take it above is not applied, and throws. With `min` this makes a
		 *   safe stock decrement or a quota that cannot be overspent.
		 * @param ifMissing Top-level attributes to set only when the item does not
		 *   already have them, so a counter made on first use still gets what the
		 *   schema requires (`entityName`, `createdAtDate`, ...) and an existing one
		 *   keeps its own values. Validated against `options.schema.partial()`.
		 * @throws {CustomException} When `by`, `startsAt`, `min` or `max` is not a
		 *   finite number (or `min` is above `max`), when `field` is empty, when
		 *   `ifMissing` names the counter or an attribute the schema does not have
		 *   or that fails validation, or when `min`/`max` would be crossed.
		 *   DynamoDB is not called for the first of these.
		 * @returns The counter value, as a number.
		 */
		incrementOne: async ({
			key,
			field,
			by = 1,
			startsAt = 0,
			returns = 'new',
			min,
			max,
			ifMissing,
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			/** The number attribute to add to, or a dotted path to one inside a map */
			field: (keyof TType & string) | `${keyof TType & string}.${string}`;
			by?: number;
			startsAt?: number;
			returns?: 'new' | 'previous';
			min?: number;
			max?: number;
			ifMissing?: Partial<TType>;
		}): Promise<number> => {
			const fieldPath = String(field).split('.');
			if (fieldPath.some((segment) => segment === '')) {
				throw new CustomException([
					'field must be an attribute name or a dotted path',
				]);
			}
			const numberInputs = { by, startsAt, min, max };
			const notFinite = Object.entries(numberInputs).filter(
				([, value]) => value !== undefined && !Number.isFinite(value),
			);
			if (notFinite.length > 0) {
				throw new CustomException([
					`${notFinite.map(([name]) => name).join(', ')} must be finite numbers`,
				]);
			}
			if (min !== undefined && max !== undefined && min > max) {
				throw new CustomException(['min cannot be above max']);
			}
			if (ifMissing && fieldPath[0] in ifMissing) {
				throw new CustomException([
					`ifMissing cannot set ${fieldPath[0]}, it is the attribute being incremented`,
				]);
			}

			const ifMissingDto = ifMissing
				? await validate(ifMissing, { skipMissingProperties: true })
				: {};
			// Validation drops attributes the schema does not know; a counter that silently loses one is worse than an error.
			const droppedAttributes = Object.entries(ifMissing ?? {})
				.filter(
					([name, value]) => value !== undefined && !(name in ifMissingDto),
				)
				.map(([name]) => name);
			if (droppedAttributes.length > 0) {
				throw new CustomException([
					`ifMissing: ${droppedAttributes.join(', ')} not in the schema`,
				]);
			}

			// Every name goes through a `#` placeholder, so a reserved word can never break the expression.
			const expressionAttributeNames: Record<string, string> = {};
			const counterPath = fieldPath
				.map((segment, index) => {
					expressionAttributeNames[`#counter${index}`] = segment;
					return `#counter${index}`;
				})
				.join('.');
			const expressionAttributeValues: Record<string, unknown> = {
				':startsAt': startsAt,
				':by': by,
			};
			const setClauses = [
				`${counterPath} = if_not_exists(${counterPath}, :startsAt) + :by`,
			];
			Object.entries(ifMissingDto).forEach(([attributeName, value], index) => {
				expressionAttributeNames[`#missing${index}`] = attributeName;
				expressionAttributeValues[`:missing${index}`] = value;
				setClauses.push(
					`#missing${index} = if_not_exists(#missing${index}, :missing${index})`,
				);
			});

			// The bounds are judged on the value before the addition: it may be added to only while
			// min <= before + by <= max. A counter that does not exist yet starts from `startsAt`.
			const boundConditions: string[] = [];
			if (min !== undefined) {
				boundConditions.push(`${counterPath} >= :lowestBefore`);
				expressionAttributeValues[':lowestBefore'] = min - by;
			}
			if (max !== undefined) {
				boundConditions.push(`${counterPath} <= :highestBefore`);
				expressionAttributeValues[':highestBefore'] = max - by;
			}
			const firstValue = startsAt + by;
			const isFirstValueInBounds =
				(min === undefined || firstValue >= min) &&
				(max === undefined || firstValue <= max);
			// A missing attribute passes only when its first value is itself within the bounds; otherwise the
			// comparison against a missing attribute is false and the addition is refused.
			const withinBounds = `(${boundConditions.join(' AND ')})`;
			const conditionExpression =
				boundConditions.length === 0
					? undefined
					: isFirstValueInBounds
						? `attribute_not_exists(${counterPath}) OR ${withinBounds}`
						: withinBounds;

			const updateParam: UpdateCommandInput = {
				Key: key,
				TableName: options.tableName,
				UpdateExpression: `SET ${setClauses.join(', ')}`,
				...(conditionExpression && {
					ConditionExpression: conditionExpression,
				}),
				ExpressionAttributeNames: expressionAttributeNames,
				ExpressionAttributeValues: expressionAttributeValues,
				ReturnValues: returns === 'new' ? 'UPDATED_NEW' : 'ALL_OLD',
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
			};

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand (increment)`,
					message: 'Calling with',
					data: updateParam,
				});
			}

			let response;
			try {
				response = await dynamoDbClientInstance.send(
					new UpdateCommand(updateParam),
				);
			} catch (error) {
				if (
					(error as { name?: string })?.name ===
					'ConditionalCheckFailedException'
				) {
					throw new CustomException([
						`${String(field)} would go outside its allowed range`,
					]);
				}
				throw error;
			}

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand (increment)`,
					message: 'successful',
					data: { consumedCapacity: response.ConsumedCapacity?.CapacityUnits },
				});
			}

			// For a dotted path DynamoDB nests the returned value the same way. `ALL_OLD` returns nothing for
			// an item that did not exist, and no such attribute for one without it: in both cases the counter
			// started from `startsAt`.
			const returnedValue = fieldPath.reduce<unknown>(
				(parent, segment) =>
					parent && typeof parent === 'object'
						? (parent as Record<string, unknown>)[segment]
						: undefined,
				response.Attributes,
			);
			return returns === 'previous'
				? Number(returnedValue ?? startsAt)
				: Number(returnedValue);
		},

		/**
		 * Deletes a single item from the DynamoDB table (`DeleteCommand`).
		 * DynamoDB's delete is idempotent — this resolves to `true` whether or
		 * not an item with `key` actually existed, as long as the request itself
		 * does not error.
		 * @param key The primary key (and sort key, if the table has one) of the
		 *   item to delete.
		 * @returns `true` once the `DeleteCommand` has been sent successfully.
		 */
		delete: async ({
			key,
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
		}) => {
			await dynamoDbClientInstance.send(
				new DeleteCommand({
					Key: key,
					TableName: options?.tableName,
				}),
			);
			return true;
		},
	};
}
