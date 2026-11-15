import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { KeyboardLanguageTag } from "./features/keyboard-language/ui/keyboard-language-tag/keyboard-language-tag.js";

export const keyboardLanguage = plugin("keyboard-language")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.composerInput.add(KeyboardLanguageTag);
	});
