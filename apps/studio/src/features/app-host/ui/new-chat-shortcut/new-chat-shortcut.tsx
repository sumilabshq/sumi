import type { RefObject } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { chatTabs } from "@sumi/chat-tabs";
import { useShortcut } from "../../lib/shortcut/use-shortcut.js";
import { NEW_CHAT_KEY } from "../../lib/tab-keys.js";

export function NewChatShortcut({ frame }: { readonly frame: RefObject<HTMLElement | null> }): null {
	const openNewChat = useCommand(chatTabs.chatOpening.openNewChat);
	useShortcut(frame, {
		key: NEW_CHAT_KEY,
		isShifted: true,
		onPress: () => void openNewChat.run({ title: null }),
	});
	return null;
}
