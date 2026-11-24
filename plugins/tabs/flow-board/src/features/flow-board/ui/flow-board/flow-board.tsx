import { createElement as h, Fragment, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { navigation } from "@widgetarium/navigation/contract";
import { useCommand } from "@widgetarium/data-framework";
import type { PaneBoardProps } from "@sumi/sumi-host-plugin";
import {
	BOARD_ATTRIBUTE,
	PaneTabRow,
	edgesOf,
	isAtTopEdge,
	paneRectsOf,
	panesOf,
	useOpenFlowBoard,
} from "@sumi/flow-strip-plugin";
import type { OpenFlowBoard } from "@sumi/flow-strip-plugin";
import { rootWithDraft } from "../../lib/edge-shares.js";
import { pageSlotsOf } from "../../lib/page-slots.js";
import { pagePlaceOf, rowPlaceOf } from "../../lib/pane-places.js";
import { useEdgeDrag } from "../../lib/use-edge-drag.js";
import { PageHost } from "../page-host/page-host.js";
import { SplitEdge } from "../split-edge/split-edge.js";

export function FlowBoard({ drawn, empty }: PaneBoardProps): ReactElement {
	const board = useRef<HTMLDivElement | null>(null);
	const open = useOpenFlowBoard();
	return (
		<div ref={board} className="sumi-flow-board" {...{ [BOARD_ATTRIBUTE]: "" }}>
			{open === null ? empty : <BoardPanes open={open} board={board} drawn={drawn} />}
		</div>
	);
}

interface BoardPanesProps {
	readonly open: OpenFlowBoard;
	readonly board: RefObject<HTMLDivElement | null>;
	readonly drawn: PaneBoardProps["drawn"];
}

function BoardPanes({ open, board, drawn }: BoardPanesProps): ReactElement {
	const { window, board: flow } = open;
	const focusPane = useCommand(navigation.flowPanes.focus);
	const edgeDrag = useEdgeDrag(board, { window, flowId: flow.flowId });
	const root = rootWithDraft(flow.layout.root, edgeDrag.draft);
	const rects = paneRectsOf(root);
	const panes = panesOf(root);
	const onFocus = (paneId: string): void => {
		if (paneId !== flow.layout.focusedPaneId) {
			void focusPane.run({ window, flowId: flow.flowId, paneId });
		}
	};
	return (
		<>
			{pageSlotsOf(flow).map((slot) => {
				const rect = rects.find(({ paneId }) => paneId === slot.paneId);
				return rect === undefined ? null : (
					<PageHost
						key={slot.key}
						paneId={slot.paneId}
						view={slot.view}
						isActive={slot.isActive}
						place={pagePlaceOf(rect, !isAtTopEdge(rect))}
						drawn={drawn}
						onFocus={onFocus}
					/>
				);
			})}
			{rects
				.filter((rect) => !isAtTopEdge(rect))
				.map((rect) => {
					const pane = panes.find(({ id }) => id === rect.paneId);
					return (
						<div key={rect.paneId} className="sumi-flow-row" style={rowPlaceOf(rect)}>
							<PaneTabRow
								flowId={flow.flowId}
								paneId={rect.paneId}
								tabs={flow.tabs.filter(({ id }) => pane?.tabIds.includes(id))}
								activeTabId={pane?.activeTabId ?? null}
							/>
						</div>
					);
				})}
			{edgesOf(root).map((edge) => (
				<SplitEdge key={`${edge.splitId}:${edge.at}`} edge={edge} onBegin={edgeDrag.begin} />
			))}
		</>
	);
}
