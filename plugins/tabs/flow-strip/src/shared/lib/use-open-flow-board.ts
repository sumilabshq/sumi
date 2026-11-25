import { useOptionalQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import type { FlowBoard } from "./flow-board-types.js";
import { useFlowWindow } from "./flow-window-context.js";

export interface OpenFlowBoard {
	readonly window: string;
	readonly board: FlowBoard;
}

const NO_FLOW = "no-flow";

export function useOpenFlowBoard(): OpenFlowBoard | null {
	const window = useFlowWindow();
	const sidebar = useOptionalQuery(navigation.flows.sidebar, { window }).data;
	const flowId = sidebar?.windowFlowId ?? NO_FLOW;
	const board = useOptionalQuery(navigation.flowPanes.board, { flowId }).data;
	return board === null ? null : { window, board };
}
