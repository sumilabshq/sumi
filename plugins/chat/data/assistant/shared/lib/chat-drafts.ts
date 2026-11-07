import type { ChatDraft, ClaudeChoices } from "../schema/chat-draft.schema.js";
import type { ClaudeOptions } from "../schema/claude-options.schema.js";

export interface DraftsShelved {
	openChat(): string | null;
	chatDraft(chatId: string): ChatDraft | null;
	saveChatDraft(chatId: string, draft: ChatDraft): void;
}

export interface OptionsHeld {
	claudeOptions(): ClaudeOptions | null;
	saveClaudeOptions(next: ClaudeOptions): void;
}

export interface ProviderChooser {
	setup(): Promise<{ readonly chosen: string | null }>;
	chooseProvider(id: string): Promise<void>;
}

export interface ChoosingParts {
	readonly claudeOptions: OptionsHeld;
	readonly chatDrafts: DraftsShelved;
}

export const EMPTY_CHAT_DRAFT: ChatDraft = {
	said: "",
	attachments: [],
	choices: null,
	provider: null,
};

export function isDrafted(draft: ChatDraft | null): boolean {
	return draft !== null && (draft.said.trim() !== "" || draft.attachments.length > 0);
}

export function holdChatDraft(chatDrafts: DraftsShelved, chatId: string, patch: Partial<ChatDraft>): void {
	const was = chatDrafts.chatDraft(chatId);
	const next: ChatDraft = {
		...EMPTY_CHAT_DRAFT,
		...was,
		...patch,
	};
	chatDrafts.saveChatDraft(chatId, next);
	console.debug(`[widgetarium] chat ${chatId} draft ${draftSaid(was)} → ${draftSaid(next)}`);
}

export function chooseOptions({ claudeOptions, chatDrafts }: ChoosingParts, next: ClaudeOptions): void {
	claudeOptions.saveClaudeOptions(next);
	const openChat = chatDrafts.openChat();

	if (openChat === null) {
		console.debug("[widgetarium] claude choices not held in a chat draft: no chat is open yet");
		return;
	}

	holdChatDraft(chatDrafts, openChat, { choices: choicesOf(next) });
}

export function holdProvider(chatDrafts: DraftsShelved, provider: string): void {
	const openChat = chatDrafts.openChat();

	if (openChat === null) {
		console.debug("[widgetarium] provider not held in a chat draft: no chat is open yet");
		return;
	}

	holdChatDraft(chatDrafts, openChat, { provider });
}

export async function wearProvider(setup: ProviderChooser, provider: string | null, chatId: string): Promise<void> {
	if (provider === null) {
		return;
	}

	const was = (await setup.setup()).chosen;

	if (was === provider) {
		return;
	}

	try {
		await setup.chooseProvider(provider);
		console.debug(`[widgetarium] provider ${String(was)} → ${provider} (chat ${chatId} was opened)`);
	} catch (failure: unknown) {
		console.warn(`[widgetarium] chat ${chatId} keeps provider ${String(was)}: its own ${provider} was refused`, failure);
	}
}

export function wearChoices(claudeOptions: OptionsHeld, choices: ClaudeChoices | null, chatId: string): void {
	const was = claudeOptions.claudeOptions();

	if (choices === null || was === null) {
		return;
	}

	const wasChoices = JSON.stringify(choicesOf(was));

	if (wasChoices === JSON.stringify(choicesOf({ ...was, ...choices }))) {
		return;
	}

	claudeOptions.saveClaudeOptions({
		...was,
		...choices,
	});
	console.debug(`[widgetarium] claude options ${wasChoices} → ${JSON.stringify(choices)} (chat ${chatId} was opened)`);
}

function choicesOf({ mode, model, effort }: ClaudeOptions): ClaudeChoices {
	return {
		mode,
		model,
		effort,
	};
}

function draftSaid(draft: ChatDraft | null): string {
	return draft === null
		? "none"
		: `${String(draft.said.length)} chars + ${String(draft.attachments.length)} files, choices ${JSON.stringify(draft.choices)}, provider ${String(draft.provider)}`;
}
