import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { tabGroups } from "@sumi/tab-groups/contract";
import {
	GroupHueAskSchema,
	GroupIdSchema,
	GroupNameSchema,
	GroupPlaceSchema,
	NewGroupSchema,
} from "../../shared/schema/group-face.schema.js";

export const create = command()
	.public()
	.input(NewGroupSchema)
	.output(GroupIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, ownWindow }) =>
		send(tabGroups.groups.create, {
			window: ownWindow.placesWindow(),
			from: "list" in asked ? { kind: "list", list: asked.list } : { kind: "tab", tabId: asked.withTabId },
			...(asked.name === undefined ? {} : { name: asked.name }),
			...(asked.hue === undefined ? {} : { hue: asked.hue }),
		}),
	);

export const rename = command()
	.public()
	.input(GroupNameSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, name }, { send, ownWindow }) => {
		await send(tabGroups.groups.rename, { window: ownWindow.placesWindow(), id, name });
	});

export const setHue = command()
	.public()
	.input(GroupHueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, hue }, { send, ownWindow }) => {
		await send(tabGroups.groups.setHue, { window: ownWindow.placesWindow(), id, hue });
	});

export const fold = command()
	.public()
	.input(GroupIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, ownWindow }) => {
		await send(tabGroups.groups.fold, { window: ownWindow.placesWindow(), id });
	});

export const place = command()
	.public()
	.input(GroupPlaceSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, to }, { send, ownWindow }) => {
		await send(tabGroups.groups.place, { window: ownWindow.placesWindow(), id, place: to });
	});

export const ungroup = command()
	.public()
	.input(GroupIdSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, ownWindow }) => {
		await send(tabGroups.groups.ungroup, { window: ownWindow.placesWindow(), id });
	});
