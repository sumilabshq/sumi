import type { FrameSide } from "../../../shared/schema/frame-sides.schema.js";

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
	right: {
		code: "KeyB",
		needsAlt: true,
		said: "⌥⌘B",
	},
};
