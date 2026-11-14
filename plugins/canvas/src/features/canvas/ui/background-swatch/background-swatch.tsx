import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface BackgroundSwatchProps {
	readonly value: string | null;
	readonly isCustom?: boolean | undefined;
}

export function BackgroundSwatch({ value, isCustom = false }: BackgroundSwatchProps): ReactElement {
	const look = isCustom && value === null ? "sumi-canvas-swatch is-custom" : "sumi-canvas-swatch";
	return <span className={look} style={value === null ? undefined : { background: value }} aria-hidden="true" />;
}
