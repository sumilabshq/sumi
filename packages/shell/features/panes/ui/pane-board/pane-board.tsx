import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { paneLayoutOf } from "../../../../shared/lib/pane-layout.js";
import type { PaneEdge, PaneLayout, PaneRect } from "../../../../shared/lib/pane-layout.js";
import { leavesOf, withPlaced, withShare } from "../../../../shared/lib/pane-tree.js";
import type { PaneLeaf, PaneNode, PaneView } from "../../../../shared/schema/pane-tree.schema.js";
import { PaneTreeQuery } from "../../contract.js";
import { drawLayout } from "../../lib/draw-layout.js";
import { useBoardBox } from "../../lib/use-board-box.js";
import { useOpensChatAt } from "../../lib/use-opens-chat-at.js";
import { usePaneDrop } from "../../lib/use-pane-drop.js";
import type { PaneAim } from "../../lib/use-pane-drop.js";
import { PaneSlot, rectStyleOf } from "./pane-slot.js";
import { PaneSplitEdge } from "./pane-split-edge.js";

export interface PaneBoardProps {
	readonly drawn: (view: PaneView) => ReactNode;
	readonly empty: ReactNode;
}

export interface PaneBoardFrame {
	readonly chatPx: number;
	readonly onChatPx: (px: number, mostPx: number) => void;
}

const GAP_PX = 8;
const PREVIEW_ID = "pane-preview";

export function PaneBoard({ drawn, empty, chatPx, onChatPx }: PaneBoardProps & PaneBoardFrame): ReactElement {
	const { root } = useQuery(PaneTreeQuery).data;
	const board = useRef<HTMLDivElement | null>(null);
	const box = useBoardBox(board);
	const resting = paneLayoutOf(root, box, GAP_PX);
	useOpensChatAt(chatPx, resting.edges);
	const leaves = leavesOf(root);
	const aim = usePaneDrop({ board, rects: resting.rects });
	const shown = shownLayoutOf(root, aim, box) ?? resting;
	const preview = shown.rects.get(PREVIEW_ID);
	const drawDrag = (edge: PaneEdge, share: number): void => {
		if (root !== null && board.current !== null) {
			drawLayout(board.current, paneLayoutOf(withShare(root, edge.splitId, edge.at, share), box, GAP_PX));
		}
	};
	return (
		<div ref={board} className="wg-pane-board">
			{leaves.length === 0 && aim === null ? <div className="wg-pane-empty">{empty}</div> : null}
			{leaves.map((leaf) => (
				<PaneSlot key={leaf.id} leaf={leaf} rect={shown.rects.get(leaf.id) ?? preview ?? box} drawn={drawn} />
			))}
			{aim === null
				? resting.edges.map((edge) => (
						<PaneSplitEdge
							key={`${edge.splitId}:${edge.at}`}
							edge={edge}
							gap={GAP_PX}
							onDrag={drawDrag}
							onChatPx={onChatPx}
						/>
					))
				: null}
			{preview === undefined ? null : <div className="wg-pane-preview" style={rectStyleOf(preview)} />}
		</div>
	);
}

function shownLayoutOf(root: PaneNode | null, aim: PaneAim | null, box: PaneRect): PaneLayout | null {
	if (aim === null) {
		return null;
	}

	const previewed = withPlaced(root, aim, previewOf(aim));
	return previewed === null ? null : paneLayoutOf(previewed, box, GAP_PX);
}

function previewOf(aim: PaneAim): PaneLeaf {
	return {
		kind: "pane",
		id: PREVIEW_ID,
		view: aim.view,
	};
}
