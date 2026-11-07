import { ANY_EXTENSION, FilesPlugin, FileViewersSlot, OpenInSystemAppAction } from "@sumi/files-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CODE_ICON } from "./features/code/lib/code-icon.js";
import { LazyCodeView } from "./features/code/lib/lazy-code-view.js";
import { CodeCopyAction } from "./features/code/ui/code-copy-action/code-copy-action.js";
import { ValuesAction } from "./features/code/ui/values-action/values-action.js";
import { WrapAction } from "./features/code/ui/wrap-action/wrap-action.js";

export const CodeViewerPlugin = plugin("code-viewer")
	.require(FilesPlugin)
	.fill(
		FileViewersSlot({
			id: "code-viewer",
			title: "Code",
			icon: CODE_ICON,
			extensions: [ANY_EXTENSION, "json", "yaml", "yml", "xml", "env", "toml", "txt", "log"],
			view: LazyCodeView,
			actions: [ValuesAction, WrapAction, CodeCopyAction, OpenInSystemAppAction],
		}),
	);
