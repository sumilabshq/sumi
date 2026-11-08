import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { places } from "@widgetarium/places/contract";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { OpenedTabSchema, TabToOpenSchema } from "../../shared/schema/app-tab.schema.js";
import { TabPinSchema } from "../../shared/schema/tab-mark.schema.js";
import { openTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";

export const open = command()
	.public()
	.input(TabToOpenSchema)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.handle((asked, { send, emit, ...injects }) =>
		openTabSettled({ injects, send, told: () => emit(tabsSettled) }, asked),
	);

export const openBelow = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabOpening.openBelow, { at, id }),
		);
	});

export const duplicate = command()
	.public()
	.input(
		z.object({
			id: z.string(),
			list: z.string().nullable().default(null),
			groupId: z.string().nullable().default(null),
			show: z.boolean().default(true),
		}),
	)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, ...injects }) => {
		const opened = await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabOpening.duplicate, { at, ...asked }),
		);
		return { id: opened.id };
	});

export const reload = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabShowing.reload, { at, id }),
		);
	});

export const rename = command()
	.public()
	.input(z.object({ id: z.string(), label: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, label }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.rename, { window: studioWindow.windowLabel(), id, label });
		emit(tabsSettled);
	});

export const closeOthers = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeOthers, { at, id }),
		);
	});

export const reopenClosed = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabOpening.reopenClosed, { at, tabId: null }),
		);
	});

export const close = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.close, { at, id }),
		);
	});

export const closeShown = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeShown, { at }),
		);
	});

export const tearOff = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabShowing.tearOff, { at, id }),
		);
	});

export const closeGroup = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeGroup, { at, id }),
		);
	});

export const pin = command()
	.public()
	.input(TabPinSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, isPinned }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.pin, { window: studioWindow.windowLabel(), id, isPinned });
		emit(tabsSettled);
	});
