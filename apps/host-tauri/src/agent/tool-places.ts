import { z } from "zod";
import type { StartedApp } from "@widgetarium/core/requests";
import { THIS_CHAT, WORKSPACE } from "./app-state.js";
import type { Sidebar, SidebarTab } from "./app-state.js";

export interface ToolContext {
	readonly app: StartedApp;
	readonly chatId: string;
}

export interface TabSpot {
	readonly list: string;
	readonly groupId: string | null;
	readonly title: string;
	readonly address: string | null;
}

type SidebarEntry = Sidebar["sections"][number]["entries"][number];

interface PlacedTab extends TabSpot {
	readonly id: string;
}

const BAD_INPUT = "The {tool} input is not what the tool takes: {reason}";
const NO_TAB = "No tab {id} stands in a tab list.";
const NO_GROUP = "No group {id} stands in a tab list.";
const FOREIGN = "{what} belongs to another chat. Sumi reads and copies from other chats but never changes them.";

export const PlaceSchema = z.string().min(1).default(THIS_CHAT);

export function inputOf<Schema extends z.ZodType>(schema: Schema, tool: string, input: unknown): z.output<Schema> {
	const parsed = schema.safeParse(input);

	if (!parsed.success) {
		throw new Error(BAD_INPUT.replace("{tool}", tool).replace("{reason}", z.prettifyError(parsed.error)));
	}

	return parsed.data;
}

export async function outputOf<T>(asked: Promise<{ ok: true; output: T } | { ok: false; reason: string }>): Promise<T> {
	const answer = await asked;

	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}

export function listOfPlace(place: string, chatId: string): string {
	return place === THIS_CHAT ? chatId : place;
}

export function placeOfList(list: string, chatId: string): string {
	return list === chatId ? THIS_CHAT : list;
}

export function assertOwnList(list: string, chatId: string, what: string): void {
	if (list === chatId || list === WORKSPACE) {
		return;
	}

	throw new Error(FOREIGN.replace("{what}", what));
}

export function spotOfTab(sidebar: Sidebar, tabId: string): TabSpot {
	const spot = placedTabsOf(sidebar).find((placed) => placed.id === tabId);

	if (spot === undefined) {
		throw new Error(NO_TAB.replace("{id}", tabId));
	}

	return spot;
}

export function listOfGroup(sidebar: Sidebar, groupId: string): string {
	const section = sidebar.sections.find(({ entries }) =>
		entries.some((entry) => entry.kind === "group" && entry.group.id === groupId),
	);

	if (section === undefined) {
		throw new Error(NO_GROUP.replace("{id}", groupId));
	}

	return section.list;
}

function placedTabsOf(sidebar: Sidebar): readonly PlacedTab[] {
	return sidebar.sections.flatMap(({ list, entries }) => entries.flatMap((entry) => placedInEntry(list, entry)));
}

function placedInEntry(list: string, entry: SidebarEntry): readonly PlacedTab[] {
	if (entry.kind === "tab") {
		return [spotOf(list, null, entry.tab)];
	}

	return entry.group.tabs.map((tab) => spotOf(list, entry.group.id, tab));
}

function spotOf(list: string, groupId: string | null, tab: SidebarTab): PlacedTab {
	return {
		id: tab.id,
		list,
		groupId,
		title: tab.title,
		address: tab.address,
	};
}
