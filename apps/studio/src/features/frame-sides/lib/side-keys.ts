import type { FrameSide } from "@widgetarium/layout/contract";

export interface SideKeys {
	readonly code: string;
	readonly needsAlt: boolean;
	readonly said: string;
}

export const SIDE_KEYS: Readonly<Record<FrameSide, SideKeys>> = {
	left: {
		code: "KeyB",
		needsAlt: false,
		said: "⌘B",
	},
};
