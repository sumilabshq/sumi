import type { ChatTabState } from "./chat-tab-state.schema.js";

export type ChatTabMotion = "blink" | "bob" | "still";

export interface ChatTabStroke {
	readonly d: string;
	readonly width: number;
}

export interface ChatTabLook {
	readonly eyes: readonly [left: ChatTabStroke, right: ChatTabStroke];
	readonly mouth: ChatTabStroke | null;
	readonly motion: ChatTabMotion;
}

export const CHAT_TAB_VIEW_BOX = "14 24 92 92";

const OPEN_EYE_WIDTH = 10;
const SMILE_WIDTH = 6;

const OPEN: ChatTabLook = {
	eyes: [
		{
			d: "M47.5 57 Q47.5 66 47.5 75",
			width: OPEN_EYE_WIDTH,
		},
		{
			d: "M72.5 57 Q72.5 66 72.5 75",
			width: OPEN_EYE_WIDTH,
		},
	],
	mouth: null,
	motion: "blink",
};

export const CHAT_TAB_LOOKS: Readonly<Record<ChatTabState, ChatTabLook>> = {
	idle: OPEN,
	working: {
		eyes: [
			{
				d: "M47.5 64 Q47.5 66 47.5 68",
				width: OPEN_EYE_WIDTH,
			},
			{
				d: "M72.5 64 Q72.5 66 72.5 68",
				width: OPEN_EYE_WIDTH,
			},
		],
		mouth: null,
		motion: "bob",
	},
	done: {
		eyes: [
			{
				d: "M43 69 Q47.5 60 52 69",
				width: SMILE_WIDTH,
			},
			{
				d: "M68 69 Q72.5 60 77 69",
				width: SMILE_WIDTH,
			},
		],
		mouth: {
			d: "M55 82 Q60 88 65 82",
			width: SMILE_WIDTH,
		},
		motion: "still",
	},
	// TODO: a failed face; the board draws none yet
	failed: OPEN,
};
