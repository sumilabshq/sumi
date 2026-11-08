import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { places } from "@widgetarium/places/contract";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { OpenedTabSchema, TabToOpenSchema } from "../../shared/schema/app-tab.schema.js";
import { TabPinSchema } from "../../shared/schema/tab-mark.schema.js";
import { openTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";

export const openTab = command()
	.public()
	.input(TabToOpenSchema)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.handle((asked, { send, emit, ...injects }) =>
		openTabSettled({ injects, send, told: () => emit(tabsSettled) }, asked),
	);

export const openTabBelow = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabOpening.openTabBelow, { at, id }),
		);
	});

export const duplicateTab = command()
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
			send(places.tabOpening.duplicateTab, { at, ...asked }),
		);
		return { id: opened.id };
	});

export const reloadTab = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabShowing.reloadTab, { at, id }),
		);
	});

export const renameTab = command()
	.public()
	.input(z.object({ id: z.string(), label: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, label }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.renameTab, { window: studioWindow.windowLabel(), id, label });
		emit(tabsSettled);
	});

export const closeOtherTabs = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeOtherTabs, { at, id }),
		);
	});

export const reopenClosedTab = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabOpening.reopenClosedTab, { at, tabId: null }),
		);
	});

export const closeTab = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeTab, { at, id }),
		);
	});

export const closeShownTab = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabClosing.closeShownTab, { at }),
		);
	});

export const tearOffTab = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabShowing.tearOffTab, { at, id }),
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

export const pinTab = command()
	.public()
	.input(TabPinSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, isPinned }, { send, emit, studioWindow }) => {
		await send(places.tabPlacing.pinTab, { window: studioWindow.windowLabel(), id, isPinned });
		emit(tabsSettled);
	});
