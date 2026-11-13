import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FolderButton } from "./features/working-folder/ui/folder-button/folder-button.js";

export const workingFolder = plugin("working-folder")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsStart.add(FolderButton);
	});
