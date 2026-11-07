import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import {
	CreateGroupCommand as PlacesCreateGroupCommand,
	FoldGroupCommand as PlacesFoldGroupCommand,
	FoldTabCommand as PlacesFoldTabCommand,
	PlaceGroupCommand as PlacesPlaceGroupCommand,
	RenameGroupCommand as PlacesRenameGroupCommand,
	SetGroupHueCommand as PlacesSetGroupHueCommand,
	UngroupCommand as PlacesUngroupCommand,
} from "@widgetarium/places";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { GroupFaceSchema, GroupHueSchema } from "../../shared/schema/tab-group.schema.js";

export const CreateGroupCommand = command("create-group")
	.public()
	.input(z.union([z.object({ withTabId: z.string() }), z.object({ list: z.string() })]).and(GroupFaceSchema))
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, studioWindow }) => {
		const from =
			"list" in asked ? { kind: "list" as const, list: asked.list } : { kind: "tab" as const, tabId: asked.withTabId };
		const created = await send(PlacesCreateGroupCommand, {
			window: studioWindow.windowLabel(),
			from,
			...(asked.name === undefined ? {} : { name: asked.name }),
			...(asked.hue === undefined ? {} : { hue: asked.hue }),
		});
		emit(TabsSettledEvent);
		return created;
	});

export const RenameGroupCommand = command("rename-group")
	.public()
	.input(z.object({ id: z.string(), name: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, name }, { send, emit, studioWindow }) => {
		await send(PlacesRenameGroupCommand, { window: studioWindow.windowLabel(), id, name });
		emit(TabsSettledEvent);
	});

export const SetGroupHueCommand = command("set-group-hue")
	.public()
	.input(z.object({ id: z.string(), hue: GroupHueSchema.nullable() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, hue }, { send, emit, studioWindow }) => {
		await send(PlacesSetGroupHueCommand, { window: studioWindow.windowLabel(), id, hue });
		emit(TabsSettledEvent);
	});

export const FoldGroupCommand = command("fold-group")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(PlacesFoldGroupCommand, { window: studioWindow.windowLabel(), id });
		emit(TabsSettledEvent);
	});

export const PlaceGroupCommand = command("place-group")
	.public()
	.input(
		z.object({
			id: z.string().min(1),
			to: z.object({
				list: z.string().min(1),
				before: z.string().nullable(),
			}),
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, to }, { send, emit, studioWindow }) => {
		await send(PlacesPlaceGroupCommand, { window: studioWindow.windowLabel(), id, place: to });
		emit(TabsSettledEvent);
	});

export const FoldTabCommand = command("fold-tab")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(PlacesFoldTabCommand, { window: studioWindow.windowLabel(), id });
		emit(TabsSettledEvent);
	});

export const UngroupCommand = command("ungroup")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(PlacesUngroupCommand, { window: studioWindow.windowLabel(), id });
		emit(TabsSettledEvent);
	});
