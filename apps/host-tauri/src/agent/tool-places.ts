import { z } from "zod";
import type { StartedApp } from "@widgetarium/framework";
import { PINNED, THIS_CHAT, WORKSPACE } from "./app-state.js";
import { tabListsOf } from "./sidebar-lists.js";
import type { ListedEntry, Sidebar, SidebarTab } from "./sidebar-lists.js";

export interface QueueTaker {
	readonly handQueueToAgent: (chatId: string) => string | null;
}

export interface ToolContext {
	readonly app: StartedApp;
	readonly chatId: string;
	readonly queue: QueueTaker;
}

export type ChatReach = Pick<ToolContext, "app" | "chatId">;

export interface TabSpot {
	readonly list: string;
	readonly groupId: string | null;
	readonly title: string;
	readonly address: string | null;
}

interface PlacedTab extends TabSpot {
	readonly id: string;
}

const SHARED_LISTS: ReadonlySet<string> = new Set([WORKSPACE, PINNED]);
const BAD_INPUT = "The {tool} input is not what the tool takes: {reason}";
const NOT_AN_OBJECT = "The {tool} input is not an object.";
const NO_TAB = "No tab {id} stands in a tab list.";
const NO_GROUP = "No group {id} stands in a tab list.";
const FOREIGN = "{what} belongs to another chat. Sumi reads and copies from other chats but never changes them.";

export const PlaceSchema = z.string().min(1).default(THIS_CHAT);

export function fieldsOf(tool: string, input: unknown): Readonly<Record<string, unknown>> {
	if (!isFields(input)) {
		throw new Error(NOT_AN_OBJECT.replace("{tool}", tool));
	}

	return withoutNulls(input);
}

function withoutNulls(fields: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
	return Object.fromEntries(
		Object.entries(fields)
			.filter(([, value]) => value !== null)
			.map(([key, value]) => [key, withoutNullsIn(value)]),
	);
}

function withoutNullsIn(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(withoutNullsIn);
	}

	return isFields(value) ? withoutNulls(value) : value;
}

function isFields(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
	if (list === chatId || SHARED_LISTS.has(list)) {
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
	const found = tabListsOf(sidebar).find(({ entries }) =>
		entries.some((entry) => entry.kind === "group" && entry.id === groupId),
	);

	if (found === undefined) {
		throw new Error(NO_GROUP.replace("{id}", groupId));
	}

	return found.list;
}

function placedTabsOf(sidebar: Sidebar): readonly PlacedTab[] {
	return tabListsOf(sidebar).flatMap(({ list, entries }) => entries.flatMap((entry) => placedInEntry(list, entry)));
}

function placedInEntry(list: string, entry: ListedEntry): readonly PlacedTab[] {
	if (entry.kind === "tab") {
		return [spotOf(list, null, entry.tab)];
	}

	return entry.kind === "group" ? entry.tabs.map((tab) => spotOf(list, entry.id, tab)) : [];
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
