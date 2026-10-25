export interface FocusedChat {
	readonly id: string;
	readonly title: string;
}

export interface FocusedChatPort {
	readonly now: () => FocusedChat | null;
	readonly isOnScreen: (chatId: string) => boolean;
	readonly watch: (changed: () => void) => () => void;
}

export const NEW_CHAT_TITLE = "New chat";

const FIRST_CHAT: FocusedChat = {
	id: "chat-1",
	title: NEW_CHAT_TITLE,
};

export const ONE_CHAT: FocusedChatPort = {
	now: () => FIRST_CHAT,
	isOnScreen: (chatId) => chatId === FIRST_CHAT.id,
	watch: () => () => undefined,
};
