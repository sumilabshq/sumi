import { agent } from "@sumi/agent-plugin";
import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CHAT_IMAGES_GUIDE } from "./features/said-images/lib/chat-images-guide.js";
import { SaidImages } from "./features/said-images/ui/said-images/said-images.js";

export const chatImages = plugin("chat-images")
	.require(chat, agent)
	.apply((app) => {
		app.use(chat).slots.saidMarkdown.add(SaidImages);
		app.use(agent).addPromptPart(() => CHAT_IMAGES_GUIDE);
	});
