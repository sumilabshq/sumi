import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host";
import type { SidebarTab } from "@widgetarium/app-host";

export interface RowPick {
	readonly show: () => void;
	readonly close: () => void;
}

export function useRowPick({ tab, children }: SidebarTab): RowPick {
	const showTab = useCommand(appHost.tabs.showTab);
	const openChat = useCommand(appHost.chatOpening.openChat);
	const closeTab = useCommand(appHost.tabActions.closeTab);
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
