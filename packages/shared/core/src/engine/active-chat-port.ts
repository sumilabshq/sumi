export interface ActiveChat {
	readonly id: string;
	readonly title: string;
}

export interface ActiveChatPort {
	readonly now: () => ActiveChat;
	readonly watch: (changed: () => void) => () => void;
}

export const NEW_CHAT_TITLE = "New chat";

const FIRST_CHAT: ActiveChat = {
	id: "chat-1",
	title: NEW_CHAT_TITLE,
};

export const ONE_CHAT: ActiveChatPort = {
	now: () => FIRST_CHAT,
	watch: () => () => undefined,
};
