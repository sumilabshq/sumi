import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { chatEntriesOf, chatEntryOf, holdingChatOf } from "../../lib/chat-entries.js";

export interface ChatMenuItemsProps {
	readonly tab: AppTabState;
	readonly onDone: () => void;
}

const ITEM_ICON_PX = 16;
const CHATS_OFFERED = 3;
const MOVE_TO_CHAT = "Move to chat";
const TAKE_OUT = "Take out of {title}";

export function ChatMenuItems({ tab, onDone }: ChatMenuItemsProps): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const placeTab = useCommand(appHost.tabs.placeTab);

	if (chatEntryOf(sidebar, tab.id) !== null) {
		return null;
	}

	const holding = holdingChatOf(sidebar, tab.id);
	const placed = (asked: string, to: Parameters<typeof placeTab.run>[0]["to"]): void => {
		onDone();
		void placeTab.run({ id: tab.id, to }).then((answer) => {
			if (!answer.ok) {
				console.warn(`[widgetarium] ${asked} refused: ${answer.reason}`);
			}
		});
	};
	const chats = chatEntriesOf(sidebar)
		.filter((chat) => chat.tab.id !== holding?.chat.tab.id)
		.slice(0, CHATS_OFFERED);
	return (
		<>
			{holding === null ? null : (
				<PopoverItem
					role="menuitem"
					onClick={() =>
						placed(`taking ${tab.id} out of ${holding.chat.tab.id}`, {
							kind: "list",
							list: holding.list,
							groupId: null,
							before: null,
						})
					}
				>
					<Icon name="arrow-up-left" size={ITEM_ICON_PX} />
					{TAKE_OUT.replace("{title}", holding.chat.tab.title)}
				</PopoverItem>
			)}
			{chats.map((chat) => (
				<PopoverItem
					key={chat.tab.id}
					role="menuitem"
					sub={chat.tab.title}
					onClick={() =>
						placed(`moving ${tab.id} into ${chat.tab.id}`, {
							kind: "list",
							list: chat.tab.id,
							groupId: null,
							before: null,
						})
					}
				>
					<Icon name="message-square" size={ITEM_ICON_PX} />
					{MOVE_TO_CHAT}
				</PopoverItem>
			))}
		</>
	);
}
