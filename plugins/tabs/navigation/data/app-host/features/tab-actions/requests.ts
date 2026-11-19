import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { NavigationSchema, OnceOpenedSchema, OpenedTabSchema, TabOnceSchema, TabToOpenSchema } from "../../shared/schema/app-tab.schema.js";
import { openTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";

export const openTab = command()
	.public()
	.input(TabToOpenSchema)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.handle((asked, { send, emit, ...injects }) =>
		openTabSettled({ injects, send, told: () => emit(tabsSettled) }, asked),
	);

export const navigate = command()
	.public()
	.input(NavigationSchema)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, ...injects }) => {
		const navigated = await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabOpening.navigate, { at, ...asked }),
		);
		return { id: navigated.id };
	});

export const openOnce = command()
	.public()
	.input(TabOnceSchema)
	.output(OnceOpenedSchema)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, ...injects }) => {
		const opened = await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabOpening.openOnce, { at, ...asked }),
		);
		return {
			id: opened.id,
			heldBy: opened.heldBy,
		};
	});

export const openBelow = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabOpening.openBelow, { at, id }),
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
			send(navigation.tabOpening.duplicate, { at, ...asked }),
		);
		return { id: opened.id };
	});

export const reload = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabShowing.reload, { at, id }),
		);
	});

export const renameTab = command()
	.public()
	.input(z.object({ id: z.string(), label: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, label }, { send, emit, studioWindow }) => {
		await send(navigation.tabPlacing.rename, { window: studioWindow.placesWindow(), id, label });
		emit(tabsSettled);
	});

export const foldTab = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, studioWindow }) => {
		await send(navigation.tabPlacing.fold, { window: studioWindow.placesWindow(), id });
		emit(tabsSettled);
	});

export const closeOthers = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabClosing.closeOthers, { at, id }),
		);
	});

export const reopenClosed = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabOpening.reopenClosed, { at, tabId: null }),
		);
	});

export const closeTab = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabClosing.closeTab, { at, id }),
		);
	});

export const closeTabs = command()
	.public()
	.input(z.object({ ids: z.array(z.string()).min(1).readonly() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ ids }, { send, emit, ...injects }) => {
		for (const id of ids) {
			await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
				send(navigation.tabClosing.closeTab, { at, id }),
			);
		}
	});

export const closeShown = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabClosing.closeShown, { at }),
		);
	});

export const tearOff = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabShowing.tearOff, { at, id }),
		);
	});

export const moveToWorkspace = command()
	.public()
	.input(
		z.object({
			entry: z.object({
				kind: z.enum(["tab", "group"]),
				id: z.string().min(1),
			}),
			workspace: z.string().min(1),
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(async (asked, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.workspaceMoves.move, { at, ...asked }),
		);
	});

export const closeGroup = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabClosing.closeGroup, { at, id }),
		);
	});
