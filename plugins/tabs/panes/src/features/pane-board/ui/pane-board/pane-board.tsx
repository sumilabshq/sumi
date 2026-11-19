import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { PaneBoardProps } from "@sumi/sumi-host-plugin";
import { useBoardLook } from "../../lib/use-board-look.js";
import { useFocusesSplitMember } from "../../lib/use-focuses-split-member.js";
import { usePaneExpanding } from "../../lib/use-pane-expanding.js";
import { PaneSlot, rectStyleOf } from "../pane-slot/pane-slot.js";
import { PaneSplitEdge } from "../pane-split-edge/pane-split-edge.js";

export function PaneBoard({ drawn, empty, chatPx, bounds, onChatPx }: PaneBoardProps): ReactElement {
	const board = useRef<HTMLDivElement | null>(null);
	const look = useBoardLook(board, { chatPx, bounds });
	const focusMember = useFocusesSplitMember(look.tree);
	const expanding = usePaneExpanding(look.tree.leaves);
	return (
		<div ref={board} className="wg-pane-board" data-pane-easing={look.isEasing || expanding.isEasing ? "" : undefined}>
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
				<PaneSlot
					key={leaf.id}
					leaf={leaf}
					look={look.slotOf(leaf)}
					isClosable={look.tree.closableIds.includes(leaf.id)}
					isExpanded={expanding.expandedId === leaf.id}
					onExpand={expanding.toggle}
					drawn={drawn}
					onFocused={focusMember}
				/>
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
