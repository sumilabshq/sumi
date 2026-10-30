import { z } from "zod";
import { Repeatable, command } from "@widgetarium/core/requests";
import {
	CloseGroupCommand as PlacesCloseGroupCommand,
	CloseOtherTabsCommand as PlacesCloseOtherTabsCommand,
	CloseShownTabCommand as PlacesCloseShownTabCommand,
	CloseTabCommand as PlacesCloseTabCommand,
	DuplicateTabCommand as PlacesDuplicateTabCommand,
	OpenTabBelowCommand as PlacesOpenTabBelowCommand,
	OpenTabCommand as PlacesOpenTabCommand,
	ReloadTabCommand as PlacesReloadTabCommand,
	RenameTabCommand as PlacesRenameTabCommand,
	ReopenClosedTabCommand as PlacesReopenClosedTabCommand,
	TearOffTabCommand as PlacesTearOffTabCommand,
} from "@widgetarium/places";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import { SHOWING_PARTS as TAB_PARTS } from "../../shared/lib/tab-showing/showing-parts.js";
import { AppKindSchema, OpenedTabSchema } from "../../shared/schema/app-tab.schema.js";

export const OpenTabCommand = command("open-tab")
	.input(
		z.object({
			app: AppKindSchema,
			list: z.string().nullable().default(null),
			groupId: z.string().nullable().default(null),
			address: z.string().default(""),
			show: z.boolean().default(true),
		}),
	)
	.output(OpenedTabSchema)
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (asked, { send, emit, ...parts }) => {
		const opened = await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesOpenTabCommand, { at, ...asked }),
		);
		return { id: opened.id };
	});

export const OpenTabBelowCommand = command("open-tab-below")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesOpenTabBelowCommand, { at, id }),
		);
	});

export const DuplicateTabCommand = command("duplicate-tab")
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
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (asked, { send, emit, ...parts }) => {
		const opened = await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesDuplicateTabCommand, { at, ...asked }),
		);
		return { id: opened.id };
	});

export const ReloadTabCommand = command("reload-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesReloadTabCommand, { at, id }),
		);
	});

export const RenameTabCommand = command("rename-tab")
	.input(z.object({ id: z.string(), label: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ studioWindow: StudioWindowGateway })
	.emits(TabsSettledEvent)
	.handle(async ({ id, label }, { send, emit, studioWindow }) => {
		await send(PlacesRenameTabCommand, { window: studioWindow.windowLabel(), id, label });
		emit(TabsSettledEvent);
	});

export const CloseOtherTabsCommand = command("close-other-tabs")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseOtherTabsCommand, { at, id }),
		);
	});

export const ReopenClosedTabCommand = command("reopen-closed-tab")
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesReopenClosedTabCommand, { at, tabId: null }),
		);
	});

export const CloseTabCommand = command("close-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseTabCommand, { at, id }),
		);
	});

export const CloseShownTabCommand = command("close-shown-tab")
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async (_input, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseShownTabCommand, { at }),
		);
	});

export const TearOffTabCommand = command("tear-off-tab")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesTearOffTabCommand, { at, id }),
		);
	});

export const CloseGroupCommand = command("close-group")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject(TAB_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ id }, { send, emit, ...parts }) => {
		await settleAsked({ parts, send, told: () => emit(TabsSettledEvent) }, (at) =>
			send(PlacesCloseGroupCommand, { at, id }),
		);
	});
