import { createElement as h } from "react";
import type { ButtonHTMLAttributes, FunctionComponent, ReactElement, ReactNode, Ref } from "react";
import { Icon } from "../icons/icon";
import { buttonClass, buttonFormClass, buttonLookClass } from "../utils/class-names";
import type { ButtonForm, ButtonSize, ButtonVariant } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { buttonMark } from "./button-mark";
import { createSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import { buttonPartOf } from "./slot";
import { Slottable } from "./slottable";

export { ActionButton } from "./action-button";
export { Spinner } from "./spinner";
export { ShowMore } from "./show-more";

interface ButtonBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "form"> {
	readonly asChild?: boolean;
	readonly isLoading?: boolean;
	readonly isDone?: boolean;
	readonly block?: boolean | undefined;
	readonly form?: ButtonForm | undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

export interface SquareButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "form"> {
	readonly asChild?: boolean;
	readonly label?: string | undefined;
	readonly isLoading?: boolean;
	readonly isDone?: boolean;
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

type SquareLooks = Extract<ButtonLooks, { readonly shape: "square" }>;

type ClassProps = ButtonLooks & {
	readonly block?: boolean | undefined;
	readonly className?: string | undefined;
};

type ButtonAllProps = ButtonBaseProps &
	(
		| (Exclude<ButtonLooks, { readonly shape: "square" }> & { readonly label?: undefined; readonly icon?: undefined })
		| (SquareLooks & { readonly label: string; readonly icon?: string | undefined })
	);

const ICON_ONLY_PX = 16;

export function Button({
	asChild = false,
	isLoading = false,
	isDone = false,
	label,
	icon,
	form,
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
			aria-label={label || undefined}
			{...domPropsOf(props)}
			disabled={isDisabled}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={isDisabled ? "" : undefined}
			className={cn(classOf(props), buttonFormClass(form), isLoading && "is-loading", isDone && "is-done")}
		>
			{mark}
			{contentOf({ mark, icon, children, isSquare: props.shape === "square" })}
		</Comp>
	);
}

export const ButtonLabel: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-btn-label", props.className),
	"ButtonLabel",
);

function contentOf({
	mark,
	icon,
	children,
	isSquare,
}: {
	readonly mark: ReactElement | null;
	readonly icon: string | undefined;
	readonly children: ReactNode;
	readonly isSquare: boolean;
}): ReactNode {
	if (mark && isSquare) {
		return null;
	}

	if (icon !== undefined) {
		return <Icon name={icon} size={ICON_ONLY_PX} />;
	}

	return <Slottable>{children}</Slottable>;
}

function classOf(props: ClassProps): string {
	if (props.emphasis !== undefined || props.shape !== undefined || props.size === "md") {
		return buttonLookClass(props);
	}
	return buttonClass(props);
}
