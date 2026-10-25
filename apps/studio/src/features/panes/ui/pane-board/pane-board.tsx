import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import type { FrameBounds, PaneView } from "@widgetarium/layout";
import { useBoardLook } from "../../lib/use-board-look.js";
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

export function PaneBoard({ drawn, empty, chatPx, bounds, onChatPx }: PaneBoardProps & PaneBoardFrame): ReactElement {
	const board = useRef<HTMLDivElement | null>(null);
	const look = useBoardLook(board, { chatPx, bounds });
	return (
		<div ref={board} className="wg-pane-board" data-pane-easing={look.isEasing ? "" : undefined}>
			{look.tree.leaves.length === 0 && look.aim === null ? <div className="wg-pane-empty">{empty}</div> : null}
			{look.tree.chatGroups.map((group) => (
				<div
					key={group.groupId}
					className="wg-pane-group"
					data-pane-group={group.groupId}
					data-pane-away={look.isGroupAway(group) ? "" : undefined}
					style={look.groupPlaceOf(group)}
				/>
			))}
			{look.tree.leaves.map((leaf) => (
				<PaneSlot key={leaf.id} leaf={leaf} look={look.slotOf(leaf)} drawn={drawn} />
			))}
			{look.aim === null
				? look.edges.map((edge) => (
						<PaneSplitEdge
							key={`${edge.splitId}:${edge.at}`}
							edge={edge}
							bounds={bounds}
							onDrag={look.drawDrag}
							onChatPx={onChatPx}
						/>
					))
				: null}
			{look.preview === undefined ? null : (
				<div
					className="wg-pane-preview"
					style={{
						...rectStyleOf(look.preview),
						borderRadius: look.previewCorners,
					}}
				/>
			)}
		</div>
	);
}
