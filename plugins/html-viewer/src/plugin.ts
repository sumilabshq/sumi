import { files, FileTextCopyAction, OpenInSystemAppAction, ReloadAction, SourceAction } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { HTML_ICON } from "./features/html/lib/html-icon.js";
import { LazyHtmlView } from "./features/html/lib/lazy-html-view.js";
import metadata from "../metadata.json" with { type: "json" };

export const htmlViewer = plugin("html-viewer")
	.describe(metadata)
	.require(files)
	.apply((app) => {
		app.use(files).viewer({
			id: "html-viewer",
			title: "HTML",
			icon: HTML_ICON,
			extensions: ["html", "htm"],
			view: LazyHtmlView,
			actions: [ReloadAction, SourceAction, FileTextCopyAction, OpenInSystemAppAction],
		});
	});
