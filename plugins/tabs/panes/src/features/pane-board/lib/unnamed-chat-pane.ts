import type { PaneBoard } from "@widgetarium/app-host/contract";

export function hasUnnamedChatPane({ leaves }: PaneBoard): boolean {
	return leaves.some((leaf) => leaf.view.kind === "chat" && leaf.view.chatId === undefined);
}
