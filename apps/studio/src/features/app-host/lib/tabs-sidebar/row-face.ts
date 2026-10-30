import type { ChatState, GroupItem, SidebarTab } from "@widgetarium/app-host";

export interface RowFace {
	readonly id: string;
	readonly app: string;
	readonly title: string;
	readonly label: string | null;
	readonly isShown: boolean;
	readonly isInOwnWindow: boolean;
	readonly isUnread: boolean;
}

const CHAT_APP = "chat";

export function rowFaceOf(item: GroupItem): RowFace {
	return item.kind === "chat" ? chatFaceOf(item.chat) : tabFaceOf(item.tab);
}

function chatFaceOf({ id, title, label, isShown, mark }: ChatState): RowFace {
	return {
		id,
		app: CHAT_APP,
		title,
		label,
		isShown,
		isInOwnWindow: false,
		isUnread: mark === "unread",
	};
}

function tabFaceOf({ id, app, title, label, isShown, isInOwnWindow }: SidebarTab["tab"]): RowFace {
	return {
		id,
		app,
		title,
		label,
		isShown,
		isInOwnWindow,
		isUnread: false,
	};
}
