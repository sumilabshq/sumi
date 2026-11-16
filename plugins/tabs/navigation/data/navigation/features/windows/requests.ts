import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { windowsChanged } from "../../gateways/windows/windows.events.js";
import { WindowsGateway } from "../../gateways/windows/windows.gateway.js";
import type { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import type { MovePlacedTabs } from "../../shared/lib/settling/settling.js";
import { windowsForgotten } from "../../shared/lib/tabs/window-moves.js";
import { LiveWindowsSchema, WindowLabelSchema, WindowsSchema } from "../../shared/schema/windows.schema.js";
import { moveToCloseWindow, moveToOpenWindow, keepWindows } from "./lib/windows.js";
import type { MoveWindows } from "../../shared/schema/windows.schema.js";

export const all = query()
	.public()
	.output(WindowsSchema)
	.handle((_input, { windows }) => windows.windows());

export const openWindow = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, invalidate }) => {
		invalidate(all);
		await moveAndLog(windows, moveToOpenWindow(window, Date.now()), `open ${window}`);
	});

export const closeWindow = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { windows, tabs, placedApps, invalidate }) => {
		invalidate(all);
		await moveAndLog(windows, moveToCloseWindow(window), `close ${window}`);
		await forgetAndLog(
			tabs,
			windowsForgotten((gone) => gone === window, placedApps.placedApps()),
		);
	});

export const keepLiveWindows = command()
	.public()
	.input(LiveWindowsSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ windows: live }, { windows, tabs, placedApps, invalidate }) => {
		invalidate(all);
		await moveAndLog(windows, keepWindows(live), `keep ${live.join(", ")}`);
		await forgetAndLog(
			tabs,
			windowsForgotten((gone) => !live.includes(gone), placedApps.placedApps()),
		);
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

async function forgetAndLog(tabs: TabsGateway, forget: MovePlacedTabs<null>): Promise<void> {
	await tabs.movePlacedTabs((placed) => {
		const moved = forget(placed);
		console.info(
			`[widgetarium] ${moved.next === null ? `forget closed windows skipped: ${moved.reason}` : moved.reason}`,
		);
		return moved;
	});
}
