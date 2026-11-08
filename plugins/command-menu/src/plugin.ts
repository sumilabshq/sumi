import { commandMenu as commandMenuModule } from "@sumi/command-menu/module";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CommandMenuLayer } from "./features/command-menu/ui/command-menu-layer/command-menu-layer.js";
import { menuDoors, menuPages, menuRowSources } from "./slots.js";

export const commandMenu = plugin()
	.require(sumiHost)
	.declare(menuDoors, menuPages, menuRowSources)
	.fill(
		sumiHost.windowModules.add({
			id: "command-menu",
			module: ({ fillsOf }) =>
				commandMenuModule({
					doors: fillsOf(menuDoors),
					pages: fillsOf(menuPages),
					sources: fillsOf(menuRowSources),
				}),
		}),
		sumiHost.windowLayers.add({ id: "command-menu", layer: () => CommandMenuLayer }),
		menuDoors.add({
			id: "anywhere",
			letter: "k",
			label: "Suggested",
			placeholder: "Find tabs, chats and apps",
			startsWith: "empty",
		}),
		menuDoors.add({
			id: "new-tab",
			letter: "n",
			label: "New",
			placeholder: "Search the web or ask Sumi",
			startsWith: "empty",
		}),
		menuDoors.add({
			id: "this-tab",
			letter: "l",
			label: null,
			placeholder: "Address or search, opens in this tab",
			startsWith: "shown-tab",
		}),
	);
