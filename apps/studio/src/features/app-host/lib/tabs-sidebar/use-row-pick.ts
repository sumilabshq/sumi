import { useCommand } from "@widgetarium/core/requests";
import { CloseTabCommand, OpenChatCommand, ShowTabCommand } from "@widgetarium/app-host";
import type { GroupItem } from "@widgetarium/app-host";

export interface RowPick {
	readonly show: () => void;
	readonly close: (() => void) | null;
}

export function useRowPick(item: GroupItem): RowPick {
	const showTab = useCommand(ShowTabCommand);
	const openChat = useCommand(OpenChatCommand);
	const closeTab = useCommand(CloseTabCommand);

	if (item.kind === "chat") {
		return {
			show: () => void openChat.run({ chatId: item.chat.id, paneId: null }),
			close: null,
		};
	}

	return {
		show: () => void showTab.run({ id: item.tab.id }),
		close: () => void closeTab.run({ id: item.tab.id }),
	};
}
