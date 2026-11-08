import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { places } from "@widgetarium/places";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { GroupFaceSchema, GroupHueSchema } from "../../shared/schema/tab-group.schema.js";

export const createGroup = command()
	.public()
	.input(z.union([z.object({ withTabId: z.string() }), z.object({ list: z.string() })]).and(GroupFaceSchema))
	.output(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, studioWindow }) => {
		const from =
			"list" in asked ? { kind: "list" as const, list: asked.list } : { kind: "tab" as const, tabId: asked.withTabId };
		const created = await send(places.tabPlacing.createGroup, {
			window: studioWindow.windowLabel(),
			from,
			...(asked.name === undefined ? {} : { name: asked.name }),
			...(asked.hue === undefined ? {} : { hue: asked.hue }),
		});
		emit(tabsSettled);
		return created;
	});

export const renameGroup = command()
	.public()
	.input(z.object({ id: z.string(), name: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, name }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.renameGroup, { window: studioWindow.windowLabel(), id, name });
		emit(tabsSettled);
	});

export const setGroupHue = command()
	.public()
	.input(z.object({ id: z.string(), hue: GroupHueSchema.nullable() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, hue }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.setGroupHue, { window: studioWindow.windowLabel(), id, hue });
		emit(tabsSettled);
	});

export const foldGroup = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.foldGroup, { window: studioWindow.windowLabel(), id });
		emit(tabsSettled);
	});

export const placeGroup = command()
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
		await send(places.tabPlacing.placeGroup, { window: studioWindow.windowLabel(), id, place: to });
		emit(tabsSettled);
	});

export const foldTab = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.foldTab, { window: studioWindow.windowLabel(), id });
		emit(tabsSettled);
	});

export const ungroup = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.ungroup, { window: studioWindow.windowLabel(), id });
		emit(tabsSettled);
	});
