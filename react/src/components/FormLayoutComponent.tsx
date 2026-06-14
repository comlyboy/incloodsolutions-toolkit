import { ChangeEvent, ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { Primitive } from "@radix-ui/react-primitive";

import { parseClassnames } from "../utilities";

interface Props {
	className?: string;
	children: ReactNode;
	formGroup: UseFormReturn<any, any, any>;
	onSubmit?: (event: SubmitEvent) => void;
	onChange?: (event: ChangeEvent<HTMLFormElement>) => void;
	busy?: boolean; // optional loading state
}

export default function FormLayoutComponent({ onSubmit, onChange, formGroup, className, children, busy, }: Props) {

	return <>
		<Primitive.form onSubmit={(onSubmit && formGroup) && formGroup.handleSubmit(onSubmit)} onChange={onChange && onChange} aria-busy={busy} className={parseClassnames('space-y-6', className)}>{children}</Primitive.form>
	</>
}
