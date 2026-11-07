import {
	FilesPlugin,
	FileTextCopyAction,
	FileViewersSlot,
	OpenInSystemAppAction,
	ReloadAction,
	SourceAction,
} from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { HTML_ICON } from "./features/html/lib/html-icon.js";
import { LazyHtmlView } from "./features/html/lib/lazy-html-view.js";

export const HtmlViewerPlugin = plugin("html-viewer")
	.require(FilesPlugin)
	.fill(
		FileViewersSlot({
			id: "html-viewer",
			title: "HTML",
			icon: HTML_ICON,
			extensions: ["html", "htm"],
			view: LazyHtmlView,
			actions: [ReloadAction, SourceAction, FileTextCopyAction, OpenInSystemAppAction],
		}),
	);
