import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useOpenFlowBoard } from "../../../../shared/lib/use-open-flow-board.js";
import { isAtTopEdge, paneRectsOf, panesOf } from "../../../../shared/lib/pane-rects.js";
import { PaneTabRow } from "../../../pane-tabs/ui/pane-tab-row/pane-tab-row.js";
import { rowPlaceOf } from "../../lib/row-place.js";
import { useBoardSpan } from "../../lib/use-board-span.js";

export function FlowStrip(): ReactElement {
	const root = useRef<HTMLDivElement | null>(null);
	const span = useBoardSpan(root);
	const open = useOpenFlowBoard();
	return (
		<div ref={root} className="sumi-flow-strip">
			{open === null ? null : <TopRows open={open} span={span} />}
		</div>
	);
}

interface TopRowsProps {
	readonly open: NonNullable<ReturnType<typeof useOpenFlowBoard>>;
	readonly span: ReturnType<typeof useBoardSpan>;
}

function TopRows({ open, span }: TopRowsProps): ReactElement {
	const { board } = open;
	const panes = panesOf(board.layout.root);
	return (
		<div className="sumi-flow-strip-rows">
			{paneRectsOf(board.layout.root)
				.filter(isAtTopEdge)
				.map((rect) => {
					const pane = panes.find(({ id }) => id === rect.paneId);
					return (
						<div key={rect.paneId} className="sumi-flow-strip-pane" style={rowPlaceOf(rect, span)}>
							<PaneTabRow
								flowId={board.flowId}
								paneId={rect.paneId}
								tabs={board.tabs.filter(({ id }) => pane?.tabIds.includes(id))}
								activeTabId={pane?.activeTabId ?? null}
							/>
						</div>
					);
				})}
		</div>
	);
}
