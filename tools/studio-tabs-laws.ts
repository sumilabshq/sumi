import { FULL_LEAST_PX, ICONS_PX } from "../packages/app-host/shared/lib/tabs-column/column-look.ts";
import { isRecord } from "./page-dom.ts";

type Check = (what: string, isOk: boolean, got: unknown) => void;

export type ColumnLook = "hidden" | "icons" | "full";

interface ColumnTab {
	readonly id: string;
	readonly title: string;
	readonly isShown: boolean;
	readonly w: number;
	readonly h: number;
	readonly words: string;
}

export interface TabsSeen {
	readonly look: ColumnLook;
	readonly side: string | null;
	readonly columnWidth: number;
	readonly columnAtEnd: boolean;
	readonly headerTabs: number;
	readonly headerAllTabs: boolean;
	readonly headerAdd: boolean;
	readonly closeShown: boolean;
	readonly headerColumnToggle: boolean;
	readonly columnToggle: boolean;
	readonly columnAdd: boolean;
	readonly columnTabs: readonly ColumnTab[];
	readonly tabCount: number;
	readonly titles: readonly string[];
}

interface TabsLaw {
	readonly said: string;
	readonly holds: (seen: TabsSeen) => boolean;
	readonly shown: (seen: TabsSeen) => unknown;
}

const ICON_PX = 40;

const IN_ONE_PLACE: TabsLaw = {
	said: "tabs stand in exactly one place, and × stays a 48px button in the header",
	holds: ({ headerTabs, columnTabs, closeShown }) => headerTabs > 0 !== columnTabs.length > 0 && closeShown,
	shown: ({ headerTabs, columnTabs, closeShown }) => ({ header: headerTabs, column: columnTabs.length, closeShown }),
};

const HEADER_HOLDS_ONLY_CLOSE: TabsLaw = {
	said: "the header holds no tab pill, no ⌄ and no +",
	holds: ({ headerTabs, headerAllTabs, headerAdd }) => headerTabs === 0 && !headerAllTabs && !headerAdd,
	shown: ({ headerTabs, headerAllTabs, headerAdd }) => ({
		headerTabs,
		headerAllTabs,
		headerAdd,
	}),
};

const COLUMN_HOLDS_ITS_CONTROLS: TabsLaw = {
	said: "the column stands at the right edge with the toggle on top and + at the bottom",
	holds: ({ columnAtEnd, columnToggle, columnAdd, side }) => columnAtEnd && columnToggle && columnAdd && side === "end",
	shown: ({ columnAtEnd, columnToggle, columnAdd, side }) => ({ columnAtEnd, columnToggle, columnAdd, side }),
};

const LAWS: Readonly<Record<ColumnLook, readonly TabsLaw[]>> = {
	hidden: [
		IN_ONE_PLACE,
		{
			said: "the header holds the tab pill and ⌄, no + and no column toggle, and no column stands",
			holds: ({ headerAllTabs, headerAdd, headerColumnToggle, columnWidth }) =>
				headerAllTabs && !headerAdd && !headerColumnToggle && columnWidth === 0,
			shown: ({ headerAllTabs, headerAdd, headerColumnToggle, columnWidth }) => ({
				headerAllTabs,
				headerAdd,
				headerColumnToggle,
				columnWidth,
			}),
		},
	],
	icons: [
		IN_ONE_PLACE,
		HEADER_HOLDS_ONLY_CLOSE,
		COLUMN_HOLDS_ITS_CONTROLS,
		{
			said: `the icon column is ${ICONS_PX}px wide and every tab in it a ${ICON_PX}px icon`,
			holds: ({ columnWidth, columnTabs }) =>
				columnWidth === ICONS_PX && columnTabs.every((tab) => tab.w === ICON_PX && tab.h === ICON_PX),
			shown: ({ columnWidth, columnTabs }) => ({
				columnWidth,
				sizes: columnTabs.slice(0, 3).map((tab) => [tab.w, tab.h]),
			}),
		},
	],
	full: [
		IN_ONE_PLACE,
		HEADER_HOLDS_ONLY_CLOSE,
		COLUMN_HOLDS_ITS_CONTROLS,
		{
			said: "the full column is at least 200px wide and every row names its tab",
			holds: ({ columnWidth, columnTabs }) =>
				columnWidth >= FULL_LEAST_PX && columnTabs.every((tab) => tab.words.length > 0),
			shown: ({ columnWidth, columnTabs }) => ({ columnWidth, rows: columnTabs.slice(0, 3).map((tab) => tab.words) }),
		},
	],
};

export function isTabsSeen(value: unknown): value is TabsSeen {
	return isRecord(value) && typeof value["look"] === "string" && Array.isArray(value["columnTabs"]);
}

export function checkTabsSeen(wanted: ColumnLook, seen: TabsSeen, check: Check): void {
	check(`${wanted}: the column is ${wanted}`, seen.look === wanted, seen.look);
	for (const law of LAWS[wanted]) {
		check(`${wanted}: ${law.said}`, law.holds(seen), law.shown(seen));
	}
}
