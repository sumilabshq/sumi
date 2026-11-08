import { commandMenu as commandMenuModule } from "@sumi/command-menu/implementation";
import type { FilledDoor, FilledPage, FilledRowSource } from "@sumi/command-menu/implementation";
import { shell, windows } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CommandMenuLayer } from "./features/command-menu/ui/command-menu-layer/command-menu-layer.js";

export const commandMenu = plugin("command-menu")
	.require(windows, shell)
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
