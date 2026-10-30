import { useCommand } from "@widgetarium/core/requests";
import { CloseTabCommand, OpenChatCommand, ShowTabCommand } from "@widgetarium/app-host";
import type { SidebarTab } from "@widgetarium/app-host";

export interface RowPick {
	readonly show: () => void;
	readonly close: () => void;
}

export function useRowPick({ tab, children }: SidebarTab): RowPick {
	const showTab = useCommand(ShowTabCommand);
	const openChat = useCommand(OpenChatCommand);
	const closeTab = useCommand(CloseTabCommand);
	const close = (): void => void closeTab.run({ id: tab.id });

	if (children === undefined) {
		return {
			show: () => void showTab.run({ id: tab.id }),
			close,
		};
	}

	return {
		show: () => void openChat.run({ chatId: tab.id, paneId: null }),
		close,
	};
}
