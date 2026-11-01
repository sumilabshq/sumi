export type ChatDelivered =
	| {
			readonly ok: true;
			readonly chatId: string;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

export interface ChatDelivery {
	readonly chat: string | null;
	readonly message: string;
}

export type SendToChat = (delivery: ChatDelivery) => Promise<ChatDelivered>;

export type ListedChat = (chat: string | null) => Promise<string | null>;

const NO_CHATS = "Chats live in Sumi, and this app has no way to reach them yet.";

// TODO: deliver through a contract chats module; until then no chat is listed and no message leaves the app.
export function useSendToChat(): SendToChat {
	return () =>
		Promise.resolve({
			ok: false,
			reason: NO_CHATS,
		});
}

export function useListedChat(): ListedChat {
	return () => Promise.resolve(null);
}
