import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { windowsChanged } from "../../gateways/windows/windows.events.js";
import { WindowsGateway } from "../../gateways/windows/windows.gateway.js";
import { LiveWindowsSchema, WindowLabelSchema, WindowsSchema } from "../../shared/schema/windows.schema.js";
import { moveToCloseWindow, moveToOpenWindow, keepWindows } from "./lib/windows.js";
import type { MoveWindows } from "../../shared/schema/windows.schema.js";

export const all = query()
	.public()
	.output(WindowsSchema)
	.handle((_input, { windows }) => windows.windows());

export const open = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(all);
		await moveAndLog(windows, moveToOpenWindow(window, Date.now()), `open ${window}`);
	});

export const close = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(all);
		await moveAndLog(windows, moveToCloseWindow(window), `close ${window}`);
	});

export const keepLive = command()
	.public()
	.input(LiveWindowsSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ windows: live }, { windows, invalidate }) => {
		invalidate(all);
		await moveAndLog(windows, keepWindows(live), `keep ${live.join(", ")}`);
	});

export const reread = subscriber(windowsChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});

async function moveAndLog(windows: WindowsGateway, move: MoveWindows, asked: string): Promise<void> {
	const moved = await windows.moveWindows(move);

	if (moved === null) {
		console.info(`[widgetarium] ${asked} skipped: nothing changes`);
		return;
	}

	console.info(`[widgetarium] ${moved.reason}`);
}
