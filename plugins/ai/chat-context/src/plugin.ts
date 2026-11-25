import { chat } from "@sumi/chat-plugin";
import { chatContext as chatContextModule } from "@sumi/chat-context/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { ChatContext } from "./features/chat-context/ui/chat-context/chat-context.js";

export const chatContext = plugin("chat-context")
	.require(chat)
	.apply((app) => {
		app.use(chat).pageModule(() => chatContextModule);
		app.use(chat).slots.headTools.add(ChatContext);
	});
