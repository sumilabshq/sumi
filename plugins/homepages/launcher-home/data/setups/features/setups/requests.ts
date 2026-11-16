import { PerCall, refuse } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { command, query } from "#module";
import { SetupOpeningSchema, SetupsSchema } from "../../shared/schema/setups.schema.js";

const NO_SETUP = "no setup {id}; there are: {known}";

export const all = query()
	.public()
	.output(SetupsSchema)
	.handle((_input, { setups }) => ({ setups }));

export const open = command()
	.public()
	.input(SetupOpeningSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ id, homeTabId }, { setups, send }) => {
		const setup = setups.find((one) => one.id === id);

		if (setup === undefined) {
			const reason = NO_SETUP.replace("{id}", id).replace("{known}", setups.map((one) => one.id).join(", "));
			console.info(`[widgetarium] setup ${id} skipped: ${reason}`);
			return refuse(reason);
		}

		console.info(`[widgetarium] setup ${id}: home ${homeTabId} → chat + ${setup.panes.map(({ app }) => app).join(" + ")}`);
		const chat = await send(chatTabs.chatOpening.openNew, { title: null });
		const placed: string[] = [chat.id];

		for (const pane of setup.panes) {
			const opened = await send(appHost.tabActions.openTab, { app: pane.app, show: false });
			await send(appHost.splits.placeInView, {
				tabId: opened.id,
				targetTabId: placed[pane.besideAt] ?? chat.id,
				side: pane.side,
				isPaneMoved: false,
			});
			placed.push(opened.id);
		}

		await send(appHost.tabActions.closeTab, { id: homeTabId });
		console.info(`[widgetarium] setup ${id}: home ${homeTabId} closed → tabs ${placed.join(", ")}`);
	});
