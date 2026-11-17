import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { windowsChanged } from "../../gateways/windows/windows.events.js";
import type { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import type { MovePlacedTabs } from "../../shared/lib/settling/settling.js";
import { windowJoined, windowsLeft } from "../../shared/lib/tabs/window-moves.js";
import { LiveWindowsSchema, WindowLabelSchema, WindowsSchema } from "../../shared/schema/windows.schema.js";

export const all = query()
	.public()
	.output(WindowsSchema)
	.handle(async (_input, { tabs }) => ({ windows: (await tabs.placedTabs()).windows }));

export const openWindow = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { tabs }) => {
		await movedAndSaid(tabs, windowJoined(window, Date.now()), `open ${window}`);
	});

export const closeWindow = command()
	.public()
	.input(WindowLabelSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ window }, { tabs }) => {
		await movedAndSaid(
			tabs,
			windowsLeft((label) => label === window, "closed"),
			`close ${window}`,
		);
	});

export const keepLiveWindows = command()
	.public()
	.input(LiveWindowsSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ windows: live }, { tabs }) => {
		await movedAndSaid(
			tabs,
			windowsLeft((label) => !live.includes(label), "are no longer open"),
			`keep ${live.join(", ")}`,
		);
	});

export const reread = subscriber(windowsChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});

async function movedAndSaid(tabs: TabsGateway, move: MovePlacedTabs<null>, asked: string): Promise<void> {
	const said = await tabs.movePlacedTabs((placed) => {
		const moved = move(placed);
		return {
			...moved,
			answer: moved.next === null ? `${asked} skipped: ${moved.reason}` : moved.reason,
		};
	});
	console.info(`[widgetarium] ${said}`);
}
