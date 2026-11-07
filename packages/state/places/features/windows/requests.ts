import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { WindowsChangedEvent } from "../../gateways/windows/windows.events.js";
import { WindowsGateway } from "../../gateways/windows/windows.gateway.js";
import { LiveWindowsSchema, WindowLabelSchema, WindowsSchema } from "../../shared/schema/windows.schema.js";
import { closeWindow, openWindow, keepWindows } from "./lib/windows.js";
import type { MoveWindows } from "../../shared/schema/windows.schema.js";

export const OpenWindowsQuery = query("open-windows")
	.public()
	.output(WindowsSchema)
	.handle((_input, { windows }) => windows.windows());

export const OpenWindowCommand = command("open-window")
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(OpenWindowsQuery);
		await moveAndLog(windows, openWindow(window, Date.now()), `open ${window}`);
	});

export const CloseWindowCommand = command("close-window")
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(OpenWindowsQuery);
		await moveAndLog(windows, closeWindow(window), `close ${window}`);
	});

export const KeepLiveWindowsCommand = command("keep-live-windows")
	.public()
	.input(LiveWindowsSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ windows: live }, { windows, invalidate }) => {
		invalidate(OpenWindowsQuery);
		await moveAndLog(windows, keepWindows(live), `keep ${live.join(", ")}`);
	});

export const RereadWindowsSubscriber = subscriber(WindowsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(OpenWindowsQuery);
});

async function moveAndLog(windows: WindowsGateway, move: MoveWindows, asked: string): Promise<void> {
	const moved = await windows.moveWindows(move);

	if (moved === null) {
		console.info(`[widgetarium] ${asked} skipped: nothing changes`);
		return;
	}

	console.info(`[widgetarium] ${moved.reason}`);
}
