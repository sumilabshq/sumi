import { ANY_EXTENSION, FilesPlugin, FileViewersSlot } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CODE_ICON } from "./features/code/lib/code-icon.js";
import { LazyCodeView } from "./features/code/lib/lazy-code-view.js";

export const CodeViewerPlugin = plugin("code-viewer")
	.require(FilesPlugin)
	.fill(
		FileViewersSlot({
			id: "code-viewer",
			title: "Code",
			icon: CODE_ICON,
			extensions: [ANY_EXTENSION, "json", "yaml", "yml", "xml", "env", "toml", "txt", "log"],
			view: LazyCodeView,
		}),
	);
