import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";

export interface DropTintProps {
	readonly isOn: boolean;
	readonly radius: number;
}

const TINT: CSSProperties = {
	position: "absolute",
	top: 0,
	bottom: 0,
	insetInlineEnd: 0,
	insetInlineStart: 0,
	visibility: "visible",
	pointerEvents: "none",
	background: "var(--sumi-accent-soft)",
	transition: "opacity var(--sumi-dur-base) var(--sumi-ease-out)",
};

export function DropTint({ isOn, radius }: DropTintProps): ReactElement {
	return (
		<span
			aria-hidden="true"
			data-tabs-drop-marker=""
			style={{
				...TINT,
				borderRadius: radius,
				opacity: isOn ? 1 : 0,
			}}
		/>
	);
}
