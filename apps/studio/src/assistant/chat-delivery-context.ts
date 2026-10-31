import { createContext, useContext } from "react";
import type { ChatDeliveryPort, ListedChat, SendToChat } from "./chat-delivery.js";

const NO_STUDIO = "No studio is on screen to open a chat in.";

export const NO_CHAT_DELIVERY: ChatDeliveryPort = {
	listedChat: () => Promise.resolve(null),
	sendToChat: () =>
		Promise.resolve({
			ok: false,
			reason: NO_STUDIO,
		}),
};

export const ChatDeliveryContext = createContext<ChatDeliveryPort>(NO_CHAT_DELIVERY);

export function useSendToChat(): SendToChat {
	return useContext(ChatDeliveryContext).sendToChat;
}

export function useListedChat(): ListedChat {
	return useContext(ChatDeliveryContext).listedChat;
}
