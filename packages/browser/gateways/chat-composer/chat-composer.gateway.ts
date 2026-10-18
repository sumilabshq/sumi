export abstract class ChatComposerGateway {
	abstract prefill(text: string): Promise<void>;
}
