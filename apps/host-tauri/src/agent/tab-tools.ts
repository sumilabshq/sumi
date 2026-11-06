import { z } from "zod";
import {
	CloseGroupCommand,
	CloseTabCommand,
	CreateGroupCommand,
	DuplicateTabCommand,
	GroupHueSchema,
	OpenTabCommand,
	PlaceTabCommand,
	RenameGroupCommand,
	RenameTabCommand,
	SetGroupHueCommand,
	TabsSidebarQuery,
	UngroupCommand,
} from "@widgetarium/app-host";
import type { StartedApp } from "@widgetarium/framework";
import {
	PlaceSchema,
	inputOf,
	listOfGroup,
	listOfPlace,
	outputOf,
	placeOfList,
	assertOwnList,
	spotOfTab,
} from "./tool-places.js";
import type { ChatReach, TabSpot, ToolContext } from "./tool-places.js";
import { AgentAppSchema } from "./state-tools.js";

const ONE_GROUP = "Name either group or newGroup, not both.";
const THE_TAB = "The tab {id}";
const THE_GROUP = "The group {id}";
const THE_PLACE = "The place {place}";

const NewGroupSchema = z.strictObject({
	name: z.string().min(1),
	colour: GroupHueSchema.optional(),
});

const GroupingSchema = z.strictObject({
	place: PlaceSchema,
	group: z.string().min(1).optional(),
	newGroup: NewGroupSchema.optional(),
	show: z.boolean().default(false),
});

const TabOpenSchema = GroupingSchema.extend({ app: AgentAppSchema, target: z.string().min(1).optional() }).refine(
	isOneGroup,
	ONE_GROUP,
);

const TabDuplicateSchema = GroupingSchema.extend({ tabId: z.string().min(1) }).refine(isOneGroup, ONE_GROUP);

const TabUpdateSchema = z.strictObject({
	tabId: z.string().min(1),
	title: z.string().optional(),
	place: z.string().min(1).optional(),
	group: z.string().min(1).nullable().optional(),
	before: z.string().min(1).nullable().optional(),
});

const TabIdSchema = z.strictObject({ tabId: z.string().min(1) });

const GroupCreateSchema = z.strictObject({
	name: z.string().min(1),
	colour: GroupHueSchema.optional(),
	place: PlaceSchema,
	tabIds: z.array(z.string().min(1)).default([]),
});

const GroupUpdateSchema = z.strictObject({
	groupId: z.string().min(1),
	name: z.string().min(1).optional(),
	colour: GroupHueSchema.nullable().optional(),
});

const GroupDeleteSchema = z.strictObject({
	groupId: z.string().min(1),
	keepTabs: z.boolean().default(true),
});

type Grouping = z.output<typeof GroupingSchema>;
type TabUpdate = z.output<typeof TabUpdateSchema>;

interface ListPlace {
	readonly list: string;
	readonly groupId: string | null;
	readonly before: string | null;
}

export async function tabOpen({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(TabOpenSchema, "tab_open", input);
	const list = ownListOf(asked.place, chatId);
	const groupId = await ensureGroupId(app, list, asked);
	// TODO: honour show only while the person is idle
	const opened = await outputOf(
		app.send(OpenTabCommand, { app: asked.app, address: asked.target ?? "", list, groupId, show: asked.show }),
	);
	return placedAnswer(opened.id, asked);
}

export async function tabDuplicate({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(TabDuplicateSchema, "tab_duplicate", input);
	spotOfTab(await outputOf(app.send(TabsSidebarQuery)), asked.tabId);
	const list = ownListOf(asked.place, chatId);
	const groupId = await ensureGroupId(app, list, asked);
	const opened = await outputOf(app.send(DuplicateTabCommand, { id: asked.tabId, list, groupId, show: asked.show }));
	return placedAnswer(opened.id, asked);
}

export async function tabUpdate({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(TabUpdateSchema, "tab_update", input);
	const spot = await ownTabSpot({ app, chatId }, asked.tabId);
	const move = placementOf(spot, asked, chatId);

	if (asked.title !== undefined) {
		await outputOf(app.send(RenameTabCommand, { id: asked.tabId, label: asked.title }));
	}

	if (move !== null) {
		await placeTabs(app, [asked.tabId], move);
	}

	return tabNowOf({ app, chatId }, asked.tabId);
}

export async function tabClose({ app, chatId }: ToolContext, input: unknown) {
	const { tabId } = inputOf(TabIdSchema, "tab_close", input);
	await ownTabSpot({ app, chatId }, tabId);
	await outputOf(app.send(CloseTabCommand, { id: tabId }));
	return { closed: tabId };
}

export async function groupCreate({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(GroupCreateSchema, "group_create", input);
	const list = ownListOf(asked.place, chatId);

	for (const tabId of asked.tabIds) {
		await ownTabSpot({ app, chatId }, tabId);
	}

	const created = await outputOf(app.send(CreateGroupCommand, { list, name: asked.name, hue: asked.colour ?? null }));
	await placeTabs(app, asked.tabIds, { list, groupId: created.id, before: null });
	return {
		...asked,
		id: created.id,
	};
}

export async function groupUpdate({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(GroupUpdateSchema, "group_update", input);
	await ownGroupList({ app, chatId }, asked.groupId);

	if (asked.name !== undefined) {
		await outputOf(app.send(RenameGroupCommand, { id: asked.groupId, name: asked.name }));
	}

	if (asked.colour !== undefined) {
		await outputOf(app.send(SetGroupHueCommand, { id: asked.groupId, hue: asked.colour }));
	}

	return { updated: asked.groupId };
}

export async function groupDelete({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(GroupDeleteSchema, "group_delete", input);
	await ownGroupList({ app, chatId }, asked.groupId);
	await outputOf(app.send(asked.keepTabs ? UngroupCommand : CloseGroupCommand, { id: asked.groupId }));
	return {
		deleted: asked.groupId,
		keptTabs: asked.keepTabs,
	};
}

function placedAnswer(id: string, { place, show }: Pick<Grouping, "place" | "show">) {
	return {
		id,
		place,
		isShown: show,
	};
}

function placementOf(spot: TabSpot, asked: TabUpdate, chatId: string): ListPlace | null {
	if (asked.place === undefined && asked.group === undefined && asked.before === undefined) {
		return null;
	}

	const list = asked.place === undefined ? spot.list : ownListOf(asked.place, chatId);
	return {
		list,
		groupId: asked.group === undefined ? keptGroupOf(spot, list) : asked.group,
		before: asked.before ?? null,
	};
}

function ownListOf(place: string, chatId: string): string {
	const list = listOfPlace(place, chatId);
	assertOwnList(list, chatId, THE_PLACE.replace("{place}", place));
	return list;
}

async function placeTabs(app: StartedApp, tabIds: readonly string[], place: ListPlace): Promise<void> {
	for (const id of tabIds) {
		await outputOf(app.send(PlaceTabCommand, { id, to: { kind: "list", ...place } }));
	}
}

function isOneGroup({ group, newGroup }: Pick<Grouping, "group" | "newGroup">): boolean {
	return group === undefined || newGroup === undefined;
}

async function ensureGroupId(app: StartedApp, list: string, { group, newGroup }: Grouping): Promise<string | null> {
	if (newGroup === undefined) {
		return group ?? null;
	}

	const created = await outputOf(
		app.send(CreateGroupCommand, { list, name: newGroup.name, hue: newGroup.colour ?? null }),
	);
	return created.id;
}

async function ownTabSpot({ app, chatId }: ChatReach, tabId: string): Promise<TabSpot> {
	const spot = spotOfTab(await outputOf(app.send(TabsSidebarQuery)), tabId);
	assertOwnList(spot.list, chatId, THE_TAB.replace("{id}", tabId));
	return spot;
}

async function ownGroupList({ app, chatId }: ChatReach, groupId: string): Promise<void> {
	const list = listOfGroup(await outputOf(app.send(TabsSidebarQuery)), groupId);
	assertOwnList(list, chatId, THE_GROUP.replace("{id}", groupId));
}

function keptGroupOf(spot: TabSpot, list: string): string | null {
	return list === spot.list ? spot.groupId : null;
}

async function tabNowOf({ app, chatId }: ChatReach, tabId: string) {
	const spot = spotOfTab(await outputOf(app.send(TabsSidebarQuery)), tabId);
	return {
		id: tabId,
		title: spot.title,
		address: spot.address,
		place: placeOfList(spot.list, chatId),
		groupId: spot.groupId,
	};
}
