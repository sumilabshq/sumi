import { commandMenu as commandMenuModule } from "@sumi/command-menu/implementation";
import type { FilledDoor, FilledPage, FilledRowSource } from "@sumi/command-menu/implementation";
import { apps } from "@sumi/apps-plugin";
import { shell, windows } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { HOME_APP, homeTabPage } from "./features/command-menu/lib/home-tab-page.js";
import { CommandMenuLayer } from "./features/command-menu/ui/command-menu-layer/command-menu-layer.js";
import { windowAppProviderOf } from "./features/command-menu/ui/home-page/window-app-provider.js";
import metadata from "../metadata.json" with { type: "json" };

export const commandMenu = plugin("command-menu")
	.describe(metadata)
	.require(windows, shell, apps)
	.apply((app) => {
		const doors: FilledDoor[] = [
			{
				id: "anywhere",
				letter: "k",
				label: "Suggested",
				placeholder: "Find tabs, chats and apps",
				startsWith: "empty",
			},
			{
				id: "new-tab",
				letter: "n",
				label: "New",
				placeholder: "Search the web or ask Sumi",
				startsWith: "empty",
			},
			{
				id: "sessions",
				letter: "j",
				label: "Sessions",
				placeholder: "Search sessions",
				startsWith: "empty",
			},
			{
				id: "this-tab",
				letter: "l",
				label: null,
				placeholder: "Address or search, opens in this tab",
				startsWith: "shown-tab",
			},
		];
		const pages: FilledPage[] = [];
		const sources: FilledRowSource[] = [];
		app.use(windows).module(commandMenuModule({ doors, pages, sources }));
		app.use(shell).layer(CommandMenuLayer);
		app.use(shell).provider(windowAppProviderOf);
		app.use(shell).tabPage(homeTabPage);
		app.use(apps).app({ id: HOME_APP, title: "Home", isListed: false });
		return {
			door: (door: FilledDoor): void => {
				doors.push(door);
			},
			page: (page: FilledPage): void => {
				pages.push(page);
			},
			rowSource: (source: FilledRowSource): void => {
				sources.push(source);
			},
		};
	});
