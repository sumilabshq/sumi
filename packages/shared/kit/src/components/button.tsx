import { createElement as h } from "react";
import type { ButtonHTMLAttributes, FunctionComponent, ReactElement, Ref } from "react";
import { buttonClass, buttonLookClass } from "../utils/class-names";
import type { ButtonSize, ButtonVariant } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { buttonMark } from "./button-mark";
import { createSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import { buttonPartOf } from "./slot";
import { Slottable } from "./slottable";

export { IconButton } from "./icon-button";
export { ActionButton } from "./action-button";
export { Spinner } from "./spinner";
export { ShowMore } from "./show-more";

interface ButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly isLoading?: boolean;
	readonly isDone?: boolean;
	readonly block?: boolean | undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

export interface ButtonProps extends ButtonBaseProps {
	readonly variant?: ButtonVariant | undefined;
	readonly size?: ButtonSize | undefined;
}

type AutoLookSize = "xs" | "sm" | "md" | "lg";

type AutoLook<Emphasis extends string, Tone extends string> = {
	readonly shape?: "auto";
	readonly emphasis: Emphasis;
	readonly tone?: Tone;
	readonly size?: AutoLookSize | undefined;
	readonly variant?: undefined;
};

type SquareBase = {
	readonly shape: "square";
	readonly size?: AutoLookSize | "2xs" | undefined;
	readonly variant?: undefined;
};

type ButtonLooks =
	| {
			readonly shape?: "auto";
			readonly emphasis?: undefined;
			readonly tone?: undefined;
			readonly size?: ButtonSize | undefined;
			readonly variant?: ButtonVariant | undefined;
	  }
	| {
			readonly shape?: "auto";
			readonly emphasis?: undefined;
			readonly tone?: undefined;
			readonly size: "md";
			readonly variant?: undefined;
	  }
	| AutoLook<"solid", "neutral" | "brand">
	| AutoLook<"soft", "neutral" | "brand" | "danger" | "wash">
	| AutoLook<"outline", "neutral" | "muted">
	| AutoLook<"ghost", "neutral" | "brand">
	| AutoLook<"page", "neutral">
	| (SquareBase & { readonly emphasis: "solid"; readonly tone?: "neutral" | "brand" })
	| (SquareBase & {
			readonly emphasis?: "soft" | "ghost" | "raised" | "glass" | "overlay";
			readonly tone?: "neutral";
	  });

type ClassProps = ButtonLooks & { readonly block?: boolean | undefined; readonly className?: string | undefined };

type ButtonAllProps = ButtonBaseProps &
	(
		| (Exclude<ButtonLooks, { readonly shape: "square" }> & { readonly label?: undefined })
		| (Extract<ButtonLooks, { readonly shape: "square" }> & { readonly label: string })
	);

export function Button({
	asChild = false,
	isLoading = false,
	isDone = false,
	label,
	children,
	...props
}: ButtonAllProps): ReactElement {
	const { part: Comp, type } = buttonPartOf(asChild);
	const isDisabled = Boolean(props.disabled) || isLoading;
	const mark = buttonMark(isLoading, isDone, props.size);
	return (
		<Comp
			type={type}
			data-slot="button"
			aria-label={label}
			{...domPropsOf(props)}
			disabled={isDisabled}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={isDisabled ? "" : undefined}
			className={cn(classOf(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{mark}
			{mark && props.shape === "square" ? null : <Slottable>{children}</Slottable>}
		</Comp>
	);
}

export const ButtonLabel: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-btn-label", props.className),
	"ButtonLabel",
);

function classOf(props: ClassProps): string {
	if (props.emphasis !== undefined || props.shape !== undefined || props.size === "md") {
		return buttonLookClass(props);
	}
	return buttonClass(props);
}
