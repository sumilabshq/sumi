export interface ChatRow {
	readonly id: string;
	readonly title: string;
}

// TODO: query the chat's row once the contract lists a chats module
export function useChatRow(_chatId: string | null): ChatRow | null {
	return null;
}
