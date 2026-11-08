import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { windowsChanged } from "../../gateways/windows/windows.events.js";
import { WindowsGateway } from "../../gateways/windows/windows.gateway.js";
import { LiveWindowsSchema, WindowLabelSchema, WindowsSchema } from "../../shared/schema/windows.schema.js";
import { closeWindowMove, openWindowMove, keepWindows } from "./lib/windows.js";
import type { MoveWindows } from "../../shared/schema/windows.schema.js";

export const openWindows = query()
	.public()
	.output(WindowsSchema)
	.handle((_input, { windows }) => windows.windows());

export const openWindow = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(openWindows);
		await moveAndLog(windows, openWindowMove(window, Date.now()), `open ${window}`);
	});

export const closeWindow = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(openWindows);
		await moveAndLog(windows, closeWindowMove(window), `close ${window}`);
	});

export const keepLiveWindows = command()
	.public()
	.input(LiveWindowsSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ windows: live }, { windows, invalidate }) => {
		invalidate(openWindows);
		await moveAndLog(windows, keepWindows(live), `keep ${live.join(", ")}`);
	});

export const rereadWindows = subscriber(windowsChanged).handle((_input, { invalidate }) => {
	invalidate(openWindows);
});

async function moveAndLog(windows: WindowsGateway, move: MoveWindows, asked: string): Promise<void> {
	const moved = await windows.moveWindows(move);

	if (moved === null) {
		console.info(`[widgetarium] ${asked} skipped: nothing changes`);
		return;
	}

	console.info(`[widgetarium] ${moved.reason}`);
}
