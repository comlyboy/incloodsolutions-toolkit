import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Initialize an S3 client wrapper with bucket configuration
 * @param bucketName The name of the S3 bucket to interact with
 * @param config Optional S3 client configuration
 * @returns Object containing methods for S3 operations
 */
export function initS3ClientWrapper({ bucketName, config }: {
	bucketName: string;
	config?: S3ClientConfig;
}) {
	const s3ClientInstance = new S3Client(config);

	return {
		/**
		 * Uploads a file to the configured S3 bucket
		 * @param fileName The name/path of the file in the bucket
		 * @returns Promise resolving to the upload response
		 */
		uploadFile: ({ fileName }: { fileName: string; }) => {
			return s3ClientInstance.send(new PutObjectCommand({
				Key: fileName,
				Bucket: bucketName
			}));
		},
		/**
		 * Retrieves a file from the configured S3 bucket
		 * @param fileName The name/path of the file in the bucket
		 * @returns Promise resolving to the file data
		 */
		getFile: async ({ fileName }: { fileName: string; }) => {
			return await s3ClientInstance.send(new GetObjectCommand({
				Key: fileName,
				Bucket: bucketName
			}));
		},
		/**
		 * Generates a pre-signed URL for S3 operations
		 * @param fileName The name/path of the file in the bucket
		 * @param commandType The type of operation ('read', 'create', or 'delete')
		 * @param expiresIn Number of seconds until the signed URL expires (default: 3600)
		 * @returns Promise resolving to the signed URL
		 */
		generateSignedUrl: async ({ fileName, commandType, expiresIn = 3600 }: {
			fileName: string;
			expiresIn?: number;
			commandType: 'read' | 'create' | 'delete';
		}) => {
			const input = { Key: fileName, Bucket: bucketName };
			const s3GetCommand = new GetObjectCommand({ ...input });
			const s3UploadCommand = new PutObjectCommand({ ...input });
			const s3DeleteCommand = new DeleteObjectCommand({ ...input });
			return await getSignedUrl(s3ClientInstance, commandType === 'create' ? s3UploadCommand : commandType === 'read' ? s3GetCommand : s3DeleteCommand, { expiresIn });
		},
		/**
		 * Deletes a file from the configured S3 bucket
		 * @param fileName The name/path of the file to delete
		 * @returns Promise resolving to the delete marker flag
		 */
		deleteFile: async ({ fileName }: { fileName: string; }) => {
			const { DeleteMarker } = await s3ClientInstance.send(new DeleteObjectCommand({
				Key: fileName,
				Bucket: bucketName
			}));
			return DeleteMarker;
		}

	};
}