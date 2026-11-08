import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { SidebarTab } from "@widgetarium/app-host/contract";

export interface RowPick {
	readonly show: () => void;
	readonly close: () => void;
}

export function useRowPick({ tab }: SidebarTab): RowPick {
	const showTab = useCommand(appHost.tabs.show);
	const closeTab = useCommand(appHost.tabActions.close);
	return {
		show: () => void showTab.run({ id: tab.id }),
		close: () => void closeTab.run({ id: tab.id }),
	};
}
