import { CommandMenuModule } from "@sumi/command-menu/module";
import { SumiHostPlugin, WindowLayersSlot, WindowModulesSlot } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CommandMenuLayer } from "./features/command-menu/ui/command-menu-layer/command-menu-layer.js";
import { MenuDoorsSlot, MenuPagesSlot, MenuRowSourcesSlot } from "./slots.js";

export const CommandMenuPlugin = plugin("command-menu")
	.require(SumiHostPlugin)
	.declare(MenuDoorsSlot, MenuPagesSlot, MenuRowSourcesSlot)
	.fill(
		WindowModulesSlot({
			id: "command-menu",
			module: ({ fillsOf }) =>
				CommandMenuModule({
					doors: fillsOf(MenuDoorsSlot),
					pages: fillsOf(MenuPagesSlot),
					sources: fillsOf(MenuRowSourcesSlot),
				}),
		}),
		WindowLayersSlot({ id: "command-menu", layer: () => CommandMenuLayer }),
		MenuDoorsSlot({
			id: "anywhere",
			letter: "k",
			label: "Suggested",
			placeholder: "Find tabs, chats and apps",
			startsWith: "empty",
		}),
		MenuDoorsSlot({
			id: "new-tab",
			letter: "n",
			label: "New",
			placeholder: "Search the web or ask Sumi",
			startsWith: "empty",
		}),
		MenuDoorsSlot({
			id: "this-tab",
			letter: "l",
			label: null,
			placeholder: "Address or search, opens in this tab",
			startsWith: "shown-tab",
		}),
	);
