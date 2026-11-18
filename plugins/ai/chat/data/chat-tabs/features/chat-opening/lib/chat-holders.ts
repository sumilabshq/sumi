import type { PaneBoard } from "@widgetarium/app-host/contract";

function windowHoldingChat(board: PaneBoard, chatId: string): string | null {
	return board.elsewhere.find((window) => window.chatIds.includes(chatId))?.window ?? null;
}

export function isChatHeld(board: PaneBoard, chatId: string): boolean {
	return board.chatGroups.some((group) => group.chatId === chatId) || windowHoldingChat(board, chatId) !== null;
}
