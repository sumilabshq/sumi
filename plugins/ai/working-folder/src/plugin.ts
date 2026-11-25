import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FolderButton } from "./features/working-folder/ui/folder-button/folder-button.js";
import metadata from "../metadata.json" with { type: "json" };

export const workingFolder = plugin("working-folder")
	.describe(metadata)
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.optionsStart.add(FolderButton);
	});
