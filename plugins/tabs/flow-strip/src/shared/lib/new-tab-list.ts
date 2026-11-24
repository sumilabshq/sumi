import type { FlowBoard } from "./flow-board-types.js";

export function newTabListOf(board: FlowBoard): string | null {
	return board.tabs.find(({ isChat }) => isChat)?.id ?? null;
}
