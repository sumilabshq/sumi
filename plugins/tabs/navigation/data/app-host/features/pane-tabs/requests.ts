import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { panesChanged } from "../../shared/events/panes.events.js";
import { seatOf } from "../../shared/lib/window-seat.js";

export const showInTarget = command()
	.public()
	.input(z.object({ tabId: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ tabId }, { send, emit, studioWindow }) => {
		await send(navigation.panes.showInTarget, { seat: seatOf(studioWindow), tabId });
		emit(panesChanged);
	});

export const showChat = command()
	.public()
	.input(
		z.object({
			chatId: z.string().min(1),
			paneId: z.string().nullable(),
		}),
	)
	.idempotencyKey(Repeatable)
	.handle(async ({ chatId, paneId }, { send, emit, studioWindow }) => {
		await send(navigation.panes.showChat, { seat: seatOf(studioWindow), chatId, paneId });
		emit(panesChanged);
	});

export const openShown = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, studioWindow }) => {
		await send(navigation.panes.openShown, { seat: seatOf(studioWindow) });
		emit(panesChanged);
	});

export const closeShown = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, studioWindow }) => {
		await send(navigation.panes.closeShown, { seat: seatOf(studioWindow) });
		emit(panesChanged);
	});

export const closeShowingPanes = command()
	.public()
	.input(z.object({ tabIds: z.array(z.string()).readonly() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ tabIds }, { send, emit, studioWindow }) => {
		await send(navigation.panes.closeShowingPanes, { seat: seatOf(studioWindow), tabIds });
		emit(panesChanged);
	});

export const dropGoneTabs = command()
	.public()
	.input(z.object({ heldTabIds: z.array(z.string()).readonly() }))
	.idempotencyKey(Repeatable)
	.handle(async ({ heldTabIds }, { send, emit, studioWindow }) => {
		await send(navigation.panes.dropGoneTabs, { seat: seatOf(studioWindow), heldTabIds });
		emit(panesChanged);
	});
