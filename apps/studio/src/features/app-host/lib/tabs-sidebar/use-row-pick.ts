import { useCommand } from "@widgetarium/data-framework";
import { CloseTabCommand, ShowTabCommand } from "@widgetarium/app-host";
import type { SidebarTab } from "@widgetarium/app-host";

export interface RowPick {
	readonly show: () => void;
	readonly close: () => void;
}

export function useRowPick({ tab }: SidebarTab): RowPick {
	const showTab = useCommand(ShowTabCommand);
	const closeTab = useCommand(CloseTabCommand);
	return {
		show: () => void showTab.run({ id: tab.id }),
		close: () => void closeTab.run({ id: tab.id }),
	};
}
