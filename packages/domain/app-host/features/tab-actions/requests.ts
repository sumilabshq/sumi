import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { CloseGroupCommand as PlacesCloseGroupCommand, CloseOtherTabsCommand as PlacesCloseOtherTabsCommand, CloseShownTabCommand as PlacesCloseShownTabCommand, CloseTabCommand as PlacesCloseTabCommand, DuplicateTabCommand as PlacesDuplicateTabCommand, OpenTabBelowCommand as PlacesOpenTabBelowCommand, ReloadTabCommand as PlacesReloadTabCommand, RenameTabCommand as PlacesRenameTabCommand, ReopenClosedTabCommand as PlacesReopenClosedTabCommand, TearOffTabCommand as PlacesTearOffTabCommand } from "@widgetarium/places";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { OpenedTabSchema, TabToOpenSchema } from "../../shared/schema/app-tab.schema.js";
import { openTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";

export const OpenTabCommand = command("open-tab")
	.public()
	.input(TabToOpenSchema)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.handle((asked, { send, emit, ...injects }) =>
		openTabSettled({ injects, send, told: () => emit(TabsSettledEvent) }, asked),
	);

export const OpenTabBelowCommand = command("open-tab-below")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesOpenTabBelowCommand, { at, id }),
		);
	});

export const DuplicateTabCommand = command("duplicate-tab")
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
		const opened = await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesDuplicateTabCommand, { at, ...asked }),
		);
		return { id: opened.id };
	});

export const ReloadTabCommand = command("reload-tab")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesReloadTabCommand, { at, id }),
		);
	});

export const RenameTabCommand = command("rename-tab")
	.public()
	.input(z.object({ id: z.string(), label: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, label }, { send, emit, studioWindow }) => {
		await send(PlacesRenameTabCommand, { window: studioWindow.windowLabel(), id, label });
		emit(TabsSettledEvent);
	});

export const CloseOtherTabsCommand = command("close-other-tabs")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseOtherTabsCommand, { at, id }),
		);
	});

export const ReopenClosedTabCommand = command("reopen-closed-tab")
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesReopenClosedTabCommand, { at, tabId: null }),
		);
	});

export const CloseTabCommand = command("close-tab")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseTabCommand, { at, id }),
		);
	});

export const CloseShownTabCommand = command("close-shown-tab")
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseShownTabCommand, { at }),
		);
	});

export const TearOffTabCommand = command("tear-off-tab")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesTearOffTabCommand, { at, id }),
		);
	});

export const CloseGroupCommand = command("close-group")
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseGroupCommand, { at, id }),
		);
	});
