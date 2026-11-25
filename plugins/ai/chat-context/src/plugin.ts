import { chat } from "@sumi/chat-plugin";
import { chatContext as chatContextModule } from "@sumi/chat-context/implementation";
import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ChatContext } from "./features/chat-context/ui/chat-context/chat-context.js";
import { windowAppProviderOf } from "./shared/ui/window-app-provider/window-app-provider.js";

export const chatContext = plugin("chat-context")
	.require(shell, chat)
	.apply((app) => {
		app.use(shell).provider(windowAppProviderOf);
		app.use(chat).pageModule(() => chatContextModule);
		app.use(chat).slots.headTools.add(ChatContext);
	});
