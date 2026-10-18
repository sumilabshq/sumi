import { PrefillDraftCommand } from "@widgetarium/assistant";
import { ChatComposerGateway } from "@widgetarium/browser/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { StartedApp } from "@widgetarium/core/requests";

export class ChatAppComposerGateway extends ChatComposerGateway {
	constructor(private readonly chatApp: StartedApp) {
		super();
	}

	async prefill(text: string): Promise<void> {
		const answer = await this.chatApp.send(PrefillDraftCommand, { text });

		if (!answer.ok) {
			throw new Error(answer.reason);
		}
	}
}

export function withChatComposer(parts: BrowserParts, chatApp: StartedApp): BrowserParts {
	return {
		...parts,
		chatComposerGateway: new ChatAppComposerGateway(chatApp),
	};
}
