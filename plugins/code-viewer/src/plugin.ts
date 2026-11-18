import { agent } from "@sumi/agent-plugin";
import { chat } from "@sumi/chat-plugin";
import { ShownFileSchema } from "@sumi/code-work/contract";
import { codeWork } from "@sumi/code-work/implementation";
import { fileSystem } from "@sumi/contract";
import { ANY_EXTENSION, files, OpenInSystemAppAction } from "@sumi/files-plugin";
import { mcpApps } from "@sumi/mcp-apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CODE_ICON } from "./features/code/lib/code-icon.js";
import { LazyCodeView } from "./features/code/lib/lazy-code-view.js";
import { CodeCopyAction } from "./features/code/ui/code-copy-action/code-copy-action.js";
import { FILE_CARD_HEIGHT, FileCard } from "./features/code/ui/file-card/file-card.js";
import { ValuesAction } from "./features/code/ui/values-action/values-action.js";
import { WrapAction } from "./features/code/ui/wrap-action/wrap-action.js";

export const codeViewer = plugin("code-viewer")
	.require(files, agent, chat, mcpApps)
	.apply((app) => {
		app.use(files).viewer({
			id: "code-viewer",
			title: "Code",
			icon: CODE_ICON,
			extensions: [ANY_EXTENSION, "json", "yaml", "yml", "xml", "env", "toml", "txt", "log"],
			view: LazyCodeView,
			actions: [ValuesAction, WrapAction, CodeCopyAction, OpenInSystemAppAction],
		});
		app.use(agent).mcp.addServer({
			name: "code",
			modules: [codeWork],
			importsOf: (core) => [fileSystem({ over: core })],
		});
		app.use(mcpApps).add({
			name: "code-file",
			schema: ShownFileSchema,
			view: FileCard,
			height: FILE_CARD_HEIGHT,
			guide: "code-work_files_show-file: a whole text file with marked lines and short notes, opened at the first mark. Use it to point at code or config instead of pasting it.",
		});
	});
