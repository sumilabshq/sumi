import type { SidebarTab } from "@widgetarium/app-host/contract";

export interface RowFace {
	readonly id: string;
	readonly app: string;
	readonly title: string;
	readonly label: string | null;
	readonly isShown: boolean;
	readonly isNestable: boolean;
	readonly isInOwnWindow: boolean;
	readonly isUnread: boolean;
}

export function rowFaceOf({ tab }: SidebarTab): RowFace {
	return {
		id: tab.id,
		app: tab.app,
		title: tab.title,
		label: tab.label,
		isShown: tab.isShown,
		isNestable: tab.isNestable,
		isInOwnWindow: tab.isInOwnWindow,
		isUnread: tab.mark === "unread",
	};
}
