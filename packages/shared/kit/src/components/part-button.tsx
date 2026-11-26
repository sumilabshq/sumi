import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { partButtonClass } from "../utils/class-names";
import { domPropsOf } from "../utils/dom-props";
import { buttonPartOf } from "./slot";
import { Slottable } from "./slottable";

export interface PartButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "form"> {
	readonly label: string;
	readonly ref?: Ref<HTMLButtonElement>;
}

export function PartButton({ label, children, ...props }: PartButtonProps): ReactElement {
	const { part: Comp, type } = buttonPartOf(false);
	return (
		<Comp
			type={type}
			data-slot="button"
			aria-label={label}
			{...domPropsOf(props)}
			data-disabled={props.disabled ? "" : undefined}
			className={partButtonClass({ className: props.className })}
		>
			<Slottable>{children}</Slottable>
		</Comp>
	);
}
