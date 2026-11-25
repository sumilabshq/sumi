import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";
import { buttonPartOf } from "./slot";

export type PressableVariant = "ghost" | "quiet" | "soft";
export type PressableTone = "default" | "muted" | "faint";

export interface PressableProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean | undefined;
	readonly label?: string | undefined;
	readonly variant?: PressableVariant | undefined;
	readonly tone?: PressableTone | undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

const PRESSABLE_CLASS = "wg-kit-press";

export function Pressable({
	asChild = false,
	label,
	variant = "ghost",
	tone = "default",
	className,
	type,
	...button
}: PressableProps): ReactElement {
	const { part: Part, type: ownType } = buttonPartOf(asChild);
	return (
		<Part
			type={type ?? ownType}
			aria-label={label}
			data-slot="pressable"
			{...button}
			className={cn(
				PRESSABLE_CLASS,
				variant === "quiet" && "is-quiet",
				variant === "soft" && "is-soft",
				tone === "muted" && "is-muted",
				tone === "faint" && "is-faint",
				className,
			)}
		/>
	);
}
