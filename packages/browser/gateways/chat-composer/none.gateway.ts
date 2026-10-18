import { ChatComposerGateway } from "./chat-composer.gateway.js";

const NO_CHAT = "no chat stands beside this browser to take the draft";

export class NoChatComposerGateway extends ChatComposerGateway {
	prefill(): Promise<void> {
		return Promise.reject(new Error(NO_CHAT));
	}
}
