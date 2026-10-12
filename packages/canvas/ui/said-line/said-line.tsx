import { createElement as h } from "react";
import type { ReactElement } from "react";

export function SaidLine({
	said,
	className = "",
}: {
	readonly said: string | null;
	readonly className?: string;
}): ReactElement | null {
	if (!said) return null;
	return (
		<p className={`cv:m-0 cv:text-sm cv:text-[var(--wg-kit-error-ink)] ${className}`} role="status" data-canvas-said="">
			{said}
		</p>
	);
}
