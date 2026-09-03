import { ChangeEvent, ReactNode } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Primitive } from '@radix-ui/react-primitive';

import { parseClassnames } from '../utilities';

/**
 * Props for {@link FormLayoutComponent}.
 */
interface Props {
	/** Extra classes merged after the base `space-y-6` (via `parseClassnames`). */
	className?: string;
	/** Form fields / content. */
	children: ReactNode;
	/** The `react-hook-form` instance; its `handleSubmit` wraps `onSubmit`. */
	formGroup: UseFormReturn<any, any, any>;
	/** Submit handler, run through `formGroup.handleSubmit`. */
	onSubmit?: (event: SubmitEvent) => void;
	/** Native form `change` handler. */
	onChange?: (event: ChangeEvent<HTMLFormElement>) => void;
	/** Loading state; reflected as `aria-busy` on the form. */
	busy?: boolean;
}

/**
 * A minimal form wrapper: a radix `Primitive.form` with `space-y-6` spacing,
 * `aria-busy`, and submit/change handlers bound to a `react-hook-form` instance.
 *
 * @param props - See {@link Props}.
 * @returns The rendered `<form>` element.
 *
 * @example
 * <FormLayoutComponent formGroup={form} onSubmit={onSubmit} busy={isSubmitting}>
 *   {fields}
 * </FormLayoutComponent>
 */
export function FormLayoutComponent({
	onSubmit,
	onChange,
	formGroup,
	className,
	children,
	busy,
}: Props) {
	return (
		<>
			<Primitive.form
				onSubmit={onSubmit && formGroup && formGroup.handleSubmit(onSubmit)}
				onChange={onChange && onChange}
				aria-busy={busy}
				className={parseClassnames('space-y-6', className)}
			>
				{children}
			</Primitive.form>
		</>
	);
}
