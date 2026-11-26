import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { iconOf } from "./glyphs";
import { cn } from "../utils/cn";

export interface IconProps {
	readonly name: string;
	readonly fallback?: string | undefined;
	readonly size?: number | string;
	readonly className?: string | undefined;
	readonly isFilled?: boolean | undefined;
}

const ICON_PX = 13;
const FIT = "fit";
const NO_DRAWING = "";

export function Icon({
	name,
	fallback,
	size = ICON_PX,
	className: cls,
	isFilled = false,
}: IconProps): ReactElement | null {
	const drawn = iconOf(name) ?? (fallback ? iconOf(fallback) : null);
	const body = drawn?.body ?? NO_DRAWING;
	const isFit = size === FIT;
	const markup = useMemo(() => ({ __html: body }), [body]);
	if (!drawn) return null;
	return (
		<svg
			className={cn("wg-kit-icon-glyph", "is-lucide", isFilled && "is-filled", isFit && "is-fit", cls)}
			viewBox={drawn.viewBox}
			width={isFit ? undefined : size}
			height={isFit ? undefined : size}
			aria-hidden="true"
			dangerouslySetInnerHTML={markup}
		/>
	);
}
