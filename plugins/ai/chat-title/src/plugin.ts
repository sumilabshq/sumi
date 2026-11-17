import { agent } from "@sumi/agent-plugin";
import { chat } from "@sumi/chat-plugin";
import { chatNaming } from "@sumi/chat-naming/implementation";
import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { AutoTitle } from "./features/auto-title/ui/auto-title/auto-title.js";
import { titleKeeperProviderOf } from "./features/auto-title/ui/title-keeper-provider/title-keeper-provider.js";
import { RenameCommand } from "./features/rename-command/ui/rename-command/rename-command.js";
import { RENAME_GUIDE } from "./shared/lib/rename-guide.js";

export const chatTitle = plugin("chat-title")
	.require(shell, chat, agent)
	.apply((app) => {
		app.use(shell).provider(titleKeeperProviderOf);
		app.use(chat).slots.composerInput.add(AutoTitle);
		app.use(chat).slots.composerInput.add(RenameCommand);
		app.use(agent).mcp.addServer({ name: "chat-title", modules: [chatNaming] });
		app.use(agent).addPromptPart(() => RENAME_GUIDE);
	});
