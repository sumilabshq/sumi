import { createElement as h } from "react";
import type { ReactElement, Ref, TextareaHTMLAttributes } from "react";
import { fieldClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import type { InputLook } from "./input";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, InputLook {
	readonly ref?: Ref<HTMLTextAreaElement>;
}

const AREA_ROWS = 4;
const BARE_AREA_CLASS = "wg-kit-area";

export function TextArea({
	size,
	block,
	variant,
	className,
	rows = AREA_ROWS,
	...behaviour
}: TextAreaProps): ReactElement {
	if (variant === "bare") {
		return <textarea data-slot="textarea" {...behaviour} className={cn(BARE_AREA_CLASS, className)} rows={rows} />;
	}

	return (
		<label className={cn(fieldClass({ size, block, variant, className }), "is-area")}>
			<textarea data-slot="textarea" {...behaviour} className="wg-kit-field-area" rows={rows} />
		</label>
	);
}

export const Textarea = TextArea;
