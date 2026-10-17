import { HEADER_PX, INNER_PX, NESTED_PX, isCircleOf } from "./studio-render-header.ts";
import type { Check, Round } from "./studio-render-header.ts";

interface Edges {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly w: number;
	readonly h: number;
}

export interface HeaderStep {
	readonly zoom: boolean;
	readonly add: boolean;
	readonly tabLabel: boolean;
	readonly pageName: boolean;
	readonly photo: boolean;
}

interface ChatHead {
	readonly head: Edges;
	readonly mascot: Edges;
	readonly title: Edges;
	readonly menu: Round | null;
	readonly menuBox: Edges;
}

export interface AdaptiveHeader {
	readonly bar: Edges;
	readonly appRight: number;
	readonly hostLeft: number;
	readonly outside: number;
	readonly sizes: {
		readonly toggle: Round | null;
		readonly title: number;
		readonly picture: Round | null;
		readonly tabsPill: number;
		readonly tabs: readonly number[];
		readonly add: Round | null;
		readonly close: Round | null;
	};
	readonly step: HeaderStep;
	readonly chat: ChatHead | null;
}

const FULL: HeaderStep = {
	zoom: true,
	add: true,
	tabLabel: true,
	pageName: true,
	photo: true,
};

export const HEADER_STEP_AT: ReadonlyMap<number, HeaderStep> = new Map([
	[1200, FULL],
	[720, FULL],
	[480, { ...FULL, zoom: false }],
	[320, { ...FULL, zoom: false, add: false, tabLabel: false }],
	[240, { zoom: false, add: false, tabLabel: false, pageName: false, photo: false }],
]);

const BAR_SLACK_PX = 2;

interface AdaptiveLaw {
	readonly said: string;
	readonly holds: (header: AdaptiveHeader, wanted: HeaderStep | undefined) => boolean;
	readonly shown: (header: AdaptiveHeader) => unknown;
}

const ADAPTIVE_LAWS: readonly AdaptiveLaw[] = [
	{
		said: "the app zone's controls end before the host zone's begin",
		holds: ({ appRight, hostLeft }) => appRight <= hostLeft,
		shown: ({ appRight, hostLeft }) => ({ appRight, hostLeft }),
	},
	{
		said: "no control stands outside the bar, and the bar stays one 48px row",
		holds: ({ outside, bar }) => outside === 0 && bar.h === HEADER_PX,
		shown: ({ outside, bar }) => ({ outside, bar: bar.h }),
	},
	{
		said: "× stays, a 48px circle",
		holds: ({ sizes }) => isCircleOf(sizes.close, HEADER_PX),
		shown: ({ sizes }) => sizes.close,
	},
	{
		said: "every control keeps its size: 48px toggle, pills and +, 40px tabs, 36px picture",
		holds: ({ sizes }) => keepsSizes(sizes),
		shown: ({ sizes }) => sizes,
	},
	{
		said: "the header reaches the step declared for this width",
		holds: ({ step }, wanted) => wanted !== undefined && JSON.stringify(step) === JSON.stringify(wanted),
		shown: ({ step }) => step,
	},
];

export function checkAdaptiveHeader(width: number, header: AdaptiveHeader, check: Check): void {
	check(
		`header at ${width}px: the bar is ${width}px wide`,
		Math.abs(header.bar.w - width) <= BAR_SLACK_PX,
		header.bar.w,
	);
	for (const law of ADAPTIVE_LAWS) {
		check(`header at ${width}px: ${law.said}`, law.holds(header, HEADER_STEP_AT.get(width)), law.shown(header));
	}
}

export function checkChatHead(chatPx: number, header: AdaptiveHeader, check: Check): void {
	const { chat } = header;
	check(
		`chat header at ${chatPx}px: Ink, the name and a 48px … stand in one row, in that order, inside the header`,
		chat !== null && keepsChatHead(chat),
		chat,
	);
}

function keepsSizes(sizes: AdaptiveHeader["sizes"]): boolean {
	const { toggle, title, picture, add } = sizes;

	return (
		isCircleOf(toggle, HEADER_PX) &&
		title === HEADER_PX &&
		keepsTabSizes(sizes) &&
		(add === null || isCircleOf(add, HEADER_PX)) &&
		(picture === null || isCircleOf(picture, NESTED_PX))
	);
}

function keepsTabSizes({ tabsPill, tabs }: AdaptiveHeader["sizes"]): boolean {
	return tabsPill === HEADER_PX && tabs.length > 0 && tabs.every((tab) => tab === INNER_PX);
}

function keepsChatHead({ head, mascot, title, menu, menuBox }: ChatHead): boolean {
	return (
		isCircleOf(menu, HEADER_PX) &&
		mascot.w > 0 &&
		head.left <= mascot.left &&
		mascot.right <= title.left &&
		title.right <= menuBox.left &&
		menuBox.right <= head.right &&
		Math.abs(mascot.top + mascot.h / 2 - (menuBox.top + menuBox.h / 2)) <= 1
	);
}
