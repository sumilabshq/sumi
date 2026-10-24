import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOptionalQuery, useQuery } from "@widgetarium/core/requests";
import { draggedLayoutOf, fixedPlaceOf, paneLayoutOf, panePlacesOf } from "../../../../shared/lib/pane-layout.js";
import type { PaneEdge, PaneLayout, PanePlace, PaneRect, PaneSpacing } from "../../../../shared/lib/pane-layout.js";
import type { FrameBounds, PaneLeaf, PaneView, PlacementPreview } from "@widgetarium/layout";
import { PaneTreeQuery, PlacementPreviewQuery } from "@widgetarium/layout";
import { drawLayout } from "../../lib/draw-layout.js";
import { useBoardBox } from "../../lib/use-board-box.js";
import { useOpensChatAt } from "../../lib/use-opens-chat-at.js";
import { usePaneDrop } from "../../lib/use-pane-drop.js";
import { PaneSlot, rectStyleOf } from "./pane-slot.js";
import { PaneSplitEdge } from "./pane-split-edge.js";

export interface PaneBoardProps {
	readonly drawn: (view: PaneView) => ReactNode;
	readonly empty: ReactNode;
}

export interface PaneBoardFrame {
	readonly chatPx: number;
	readonly bounds: FrameBounds;
	readonly onChatPx: (px: number, mostPx: number) => void;
}

const GAP_PX = 8;
const EDGE_SLACK_PX = 1;

export function PaneBoard({ drawn, empty, chatPx, bounds, onChatPx }: PaneBoardProps & PaneBoardFrame): ReactElement {
	const { root, targetId, leaves } = useQuery(PaneTreeQuery).data;
	const board = useRef<HTMLDivElement | null>(null);
	const box = useBoardBox(board);
	const spacing: PaneSpacing = {
		gapPx: GAP_PX,
		leastPx: bounds.plateLeastPx,
	};
	const resting = paneLayoutOf(root, box, spacing);
	useOpensChatAt(chatPx, resting.edges, bounds.plateLeastPx);
	const dimmedIds = dimmedIdsOf(leaves, targetId);
	const aim = usePaneDrop({ board, rects: resting.rects, leaves });
	const previewed = useOptionalQuery(PlacementPreviewQuery, aim).data;
	const shown = shownLayoutOf(previewed, box, spacing) ?? resting;
	const preview = previewed === null || shown === resting ? undefined : shown.rects.get(previewed.placedId);
	const places = panePlacesOf(root, box, spacing);
	const placeOfLeaf = (id: string): PanePlace => {
		if (shown === resting) {
			return places.get(id) ?? fixedPlaceOf(box);
		}

		return fixedPlaceOf(shown.rects.get(id) ?? preview ?? box);
	};
	const drawDrag = (edge: PaneEdge, share: number): void => {
		if (root !== null && board.current !== null) {
			drawLayout(
				board.current,
				draggedLayoutOf({
					node: root,
					box,
					spacing,
					dragged: {
						splitId: edge.splitId,
						at: edge.at,
						share,
					},
				}),
			);
		}
	};
	return (
		<div ref={board} className="wg-pane-board">
			{leaves.length === 0 && aim === null ? <div className="wg-pane-empty">{empty}</div> : null}
			{leaves.map((leaf) => {
				const restingRect = resting.rects.get(leaf.id);
				return (
					<PaneSlot
						key={leaf.id}
						leaf={leaf}
						place={placeOfLeaf(leaf.id)}
						isAtTopLeft={isAtTopLeft(restingRect)}
						isAtTopRight={isAtTopRight(restingRect, box)}
						isDimmed={dimmedIds.has(leaf.id)}
						drawn={drawn}
					/>
				);
			})}
			{aim === null
				? resting.edges.map((edge) => (
						<PaneSplitEdge
							key={`${edge.splitId}:${edge.at}`}
							edge={edge}
							gap={GAP_PX}
							bounds={bounds}
							onDrag={drawDrag}
							onChatPx={onChatPx}
						/>
					))
				: null}
			{preview === undefined ? null : <div className="wg-pane-preview" style={rectStyleOf(preview)} />}
		</div>
	);
}

function shownLayoutOf(previewed: PlacementPreview | null, box: PaneRect, spacing: PaneSpacing): PaneLayout | null {
	return previewed === null ? null : paneLayoutOf(previewed.root, box, spacing);
}

function dimmedIdsOf(leaves: readonly PaneLeaf[], targetId: string | null): ReadonlySet<string> {
	const apps = leaves.filter((leaf) => leaf.view.kind === "app");
	const target =
		apps.find((leaf) => leaf.id === targetId) ??
		apps.find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null) ??
		apps[0];

	if (apps.length < 2 || target === undefined) {
		return new Set();
	}

	return new Set(apps.filter((leaf) => leaf.id !== target.id).map((leaf) => leaf.id));
}

function isAtTopLeft(rect: PaneRect | undefined): boolean {
	return rect !== undefined && rect.top <= EDGE_SLACK_PX && rect.left <= EDGE_SLACK_PX;
}

function isAtTopRight(rect: PaneRect | undefined, box: PaneRect): boolean {
	return rect !== undefined && rect.top <= EDGE_SLACK_PX && rect.left + rect.width >= box.width - EDGE_SLACK_PX;
}
