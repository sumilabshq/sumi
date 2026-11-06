import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";
import type { ChatDraft } from "../schema/chat-draft.schema.js";

export interface ChatDraftShelf {
	draftOf(chatId: string): ChatDraft | null;
	keep(chatId: string, draft: ChatDraft): void;
	problemOf(chatId: string): string | null;
}

export const ChatDraftsHost = hostObject<ChatDraftShelf>("ChatDraftShelf", isChatDraftShelf);

function isChatDraftShelf(held: unknown): held is ChatDraftShelf {
	return isObject(held) && typeof held["draftOf"] === "function" && typeof held["keep"] === "function" && typeof held["problemOf"] === "function";
}
