import type { SettingsPageEntry } from "@sumi/settings-registry-plugin";
import { PluginsPage } from "../ui/plugins-page/plugins-page.js";

export const pluginsPage: SettingsPageEntry = {
	id: "plugins",
	title: "Plugins",
	icon: "plug",
	section: "Extend Sumi",
	order: 10,
	description: "Each plugin adds one feature to Sumi. Switch one off and it leaves everywhere it appeared.",
	keywords: ["extension", "add-on", "build", "install", "skill"],
	view: PluginsPage,
	sections: [
		{ id: "by-sumi", title: "By Sumi", keywords: ["built-in", "installed", "switch", "turn on", "turn off"] },
		{
			id: "build",
			title: "Build your own plugin",
			description: "Tell Sumi what you need; it writes the plugin in a chat and switches it on.",
			keywords: ["create", "write", "skill"],
		},
	],
};
