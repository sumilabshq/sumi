import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { fileAppsOf } from "./features/file-app/lib/file-apps.js";
import { FileViewersSlot } from "./slots.js";

export const FilesPlugin = plugin("files")
	.require(AppsPlugin)
	.declare(FileViewersSlot)
	.fill(AppsSlot(FileViewersSlot, fileAppsOf));
