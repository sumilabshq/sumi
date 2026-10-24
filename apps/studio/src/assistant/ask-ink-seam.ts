import { PrefillDraftCommand } from "@widgetarium/assistant";
import type { StartedApp } from "@widgetarium/core/requests";
import type { AskInk } from "../features/command-menu/lib/ask-ink-context.js";

export function askInkSenderOf(chatApp: StartedApp): AskInk {
	return (text) => {
		if (text.trim() === "") {
			return;
		}

		void chatApp.send(PrefillDraftCommand, { text }).then((answer) => {
			if (!answer.ok) {
				console.error(`[widgetarium] Ask Ink could not fill the composer: ${answer.reason}`);
			}
		});
	};
}
