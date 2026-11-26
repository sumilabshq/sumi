import type { SettingsPageEntry } from "@sumi/settings-registry-plugin";
import { AppearancePage } from "../ui/appearance-page/appearance-page.js";

export const appearancePage: SettingsPageEntry = {
	id: "appearance",
	title: "Appearance",
	icon: "palette",
	section: "Sumi",
	order: 10,
	description: "How Sumi looks on this computer. Every change shows at once.",
	keywords: ["theme", "dark", "light", "font", "ink", "colour", "text", "code"],
	view: AppearancePage,
	sections: [
		{
			id: "theme",
			title: "Theme",
			description: "Black paper or white paper. System follows macOS.",
			keywords: ["dark", "light", "system"],
		},
		{
			id: "ink",
			title: "Workspace ink",
			description: "The colour of this workspace: its clover, the caret, links.",
			keywords: ["colour", "accent", "clover"],
		},
		{
			id: "text",
			title: "Text",
			description: "Sumi uses three kinds of text. Pick a font for each.",
			keywords: ["font", "typography"],
			sections: [
				{ id: "headings", title: "Headings", description: "Page titles, greetings, a document's name." },
				{ id: "ui", title: "Interface and chat", description: "Messages, menus, settings." },
				{ id: "code", title: "Code", description: "Code blocks, commands, file names in code." },
			],
		},
	],
};
