import { files, FileTextCopyAction, OpenInSystemAppAction, SourceAction } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyMarkdownView } from "./features/markdown/lib/lazy-markdown-view.js";
import { MARKDOWN_ICON } from "./features/markdown/lib/markdown-icon.js";
import metadata from "../metadata.json" with { type: "json" };

export const markdownViewer = plugin("markdown-viewer")
	.describe(metadata)
	.require(files)
	.apply((app) => {
		app.use(files).viewer({
			id: "markdown-viewer",
			title: "Markdown",
			icon: MARKDOWN_ICON,
			extensions: ["md", "markdown", "mdx"],
			view: LazyMarkdownView,
			actions: [SourceAction, FileTextCopyAction, OpenInSystemAppAction],
		});
	});
