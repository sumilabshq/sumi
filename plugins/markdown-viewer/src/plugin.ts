import {
	FilesPlugin,
	FileTextCopyAction,
	FileViewersSlot,
	OpenInSystemAppAction,
	SourceAction,
} from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyMarkdownView } from "./features/markdown/lib/lazy-markdown-view.js";
import { MARKDOWN_ICON } from "./features/markdown/lib/markdown-icon.js";

export const MarkdownViewerPlugin = plugin("markdown-viewer")
	.require(FilesPlugin)
	.fill(
		FileViewersSlot({
			id: "markdown-viewer",
			title: "Markdown",
			icon: MARKDOWN_ICON,
			extensions: ["md", "markdown", "mdx"],
			view: LazyMarkdownView,
			actions: [SourceAction, FileTextCopyAction, OpenInSystemAppAction],
		}),
	);
