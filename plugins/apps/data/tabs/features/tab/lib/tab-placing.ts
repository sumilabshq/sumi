import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { Grouping } from "../../../shared/schema/place.schema.js";
import type { PlacedTab, TabDuplicate, TabOpen } from "../../../shared/schema/tab-asks.schema.js";

const ONE_GROUP = "Name either group or newGroup, not both.";
const NO_APP = "No app {app}. A tab opens one of: {known}.";

export function refuseApp(app: string, knownIds: readonly string[]): string | null {
	if (knownIds.includes(app)) {
		return null;
	}

	return NO_APP.replace("{app}", app).replace("{known}", knownIds.join(", "));
}

export function refuseTwoGroups({ group, newGroup }: Grouping): string | null {
	return group !== undefined && newGroup !== undefined ? ONE_GROUP : null;
}

export async function openedTabIn(send: Send, list: string, asked: TabOpen): Promise<string> {
	const opened = await send(appHost.tabActions.openTab, {
		app: asked.app,
		address: asked.target ?? "",
		list,
		groupId: await groupIdFor(send, list, asked),
		show: asked.show,
	});
	return opened.id;
}

export async function duplicatedTabIn(send: Send, list: string, asked: TabDuplicate): Promise<string> {
	const opened = await send(appHost.tabActions.duplicate, {
		id: asked.tabId,
		list,
		groupId: await groupIdFor(send, list, asked),
		show: asked.show,
	});
	return opened.id;
}

export function placedTabOf(id: string, { place, show }: TabOpen | TabDuplicate): PlacedTab {
	return { id, place, isShown: show };
}

export async function groupIdFor(send: Send, list: string, { group, newGroup }: Grouping): Promise<string | null> {
	if (newGroup === undefined) {
		return group ?? null;
	}

	const created = await send(appHost.groups.create, {
		list,
		name: newGroup.name,
		hue: newGroup.colour ?? null,
	});
	return created.id;
}
