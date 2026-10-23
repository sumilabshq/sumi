import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { paneRectsOf } from "../../../../shared/lib/pane-layout.js";
import type { PaneRect } from "../../../../shared/lib/pane-layout.js";
import { leavesOf, placedRoot } from "../../../../shared/lib/pane-tree.js";
import type { PaneLeaf, PaneView } from "../../../../shared/schema/pane-tree.schema.js";
import { PaneTreeQuery } from "../../contract.js";
import { useBoardBox, useFollowsChatEdge } from "../../lib/use-board-box.js";
import { usePaneDrop } from "../../lib/use-pane-drop.js";
import type { PaneAim } from "../../lib/use-pane-drop.js";
import { rectStyleOf } from "./pane-slot.js";
import { PaneWithEdge } from "./pane-with-edge.js";

export interface PaneBoardProps {
	readonly drawn: (view: PaneView) => ReactNode;
	readonly empty: ReactNode;
}

export interface PaneBoardFrame {
	readonly chatPx: number;
	readonly chatEdge: ReactNode;
}

const GAP_PX = 8;
const PREVIEW_ID = "pane-preview";

export function PaneBoard({ drawn, empty, chatPx, chatEdge }: PaneBoardProps & PaneBoardFrame): ReactElement {
	const { root } = useQuery(PaneTreeQuery).data;
	const board = useRef<HTMLDivElement | null>(null);
	const box = useBoardBox(board);
	const ask = {
		gap: GAP_PX,
		chatPx,
	};
	useFollowsChatEdge(board, root, ask);
	const resting = paneRectsOf(root, box, ask);
	const aim = usePaneDrop({ board, rects: resting });
	const previewed = aim === null ? null : placedRoot(root, aim, previewOf(aim));
	const shown = previewed === null ? resting : paneRectsOf(previewed, box, ask);
	const preview = shown.get(PREVIEW_ID);
	const leaves = leavesOf(root);
	return (
		<div ref={board} className="wg-pane-board">
			{leaves.length === 0 && aim === null ? <div className="wg-pane-empty">{empty}</div> : null}
			{leaves.map((leaf) => {
				const rect = shown.get(leaf.id) ?? preview ?? box;
				return (
					<PaneWithEdge
						key={leaf.id}
						leaf={leaf}
						rect={rect}
						hasRight={isChatBeside(leaf, rect, box)}
						chatEdge={chatEdge}
						drawn={drawn}
					/>
				);
			})}
			{preview === undefined ? null : <div className="wg-pane-preview" style={rectStyleOf(preview)} />}
		</div>
	);
}

function previewOf(aim: PaneAim): PaneLeaf {
	return {
		kind: "pane",
		id: PREVIEW_ID,
		view: aim.view,
	};
}

function isChatBeside(leaf: PaneLeaf, rect: PaneRect, box: PaneRect): boolean {
	return leaf.view.kind === "chat" && rect.left + rect.width < box.width - GAP_PX;
}
