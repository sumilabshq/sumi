import { createElement as h, memo, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/framework";
import { PaneCloseContext } from "../../lib/pane-close-context.js";
import type { PanePlace, PaneRect } from "../../lib/pane-layout.js";
import type { SlotLook } from "../../lib/use-board-look.js";
import type { PaneLeaf, PaneView } from "@widgetarium/layout";
import { AimPaneCommand } from "@widgetarium/layout";
import { MarkTabSeenCommand } from "@widgetarium/places";
import { usePaneClosing } from "../../lib/use-pane-closing.js";

export interface PaneSlotProps {
	readonly leaf: PaneLeaf;
	readonly look: SlotLook;
	readonly drawn: (view: PaneView) => ReactNode;
	readonly onFocused: (paneId: string) => void;
}

export const PaneSlot = memo(function PaneSlot({ leaf, look, drawn, onFocused }: PaneSlotProps): ReactElement {
	const { place, isAtTopLeft, isAtTopRight, isDimmed, isMoving, isAway, corners, rim } = look;
	const close = usePaneClosing(leaf);
	const aimPane = useCommand(AimPaneCommand);
	const markTabSeen = useCommand(MarkTabSeenCommand);
	const aim = (): void => {
		void aimPane.run({ id: leaf.id });
		onFocused(leaf.id);

		if (leaf.view.kind === "chat" && leaf.view.chatId !== undefined) {
			void markTabSeen.run({ id: leaf.view.chatId });
		}
	};
	const closing = useMemo(
		() => ({
			paneId: leaf.id,
			isAtTopLeft,
			isAtTopRight,
			close,
		}),
		[close, leaf.id, isAtTopLeft, isAtTopRight],
	);
	return (
		<div
			className="wg-pane"
			style={{
				left: place.left,
				top: place.top,
				width: place.width,
				height: place.height,
				...{ "--wg-pane-rim": rim },
				...(corners === undefined ? {} : { "--wg-pane-corners": corners }),
			}}
			data-pane-id={leaf.id}
			data-pane-grouped={corners === undefined ? undefined : ""}
			data-pane-away={isAway ? "" : undefined}
			data-pane-view={leaf.view.kind}
			data-pane-dimmed={isDimmed ? "" : undefined}
			data-pane-moving={isMoving ? "" : undefined}
			onPointerDownCapture={aim}
			onFocusCapture={() => onFocused(leaf.id)}
			onWheelCapture={isDimmed ? aim : undefined}
		>
			<PaneCloseContext.Provider value={closing}>{drawn(leaf.view)}</PaneCloseContext.Provider>
		</div>
	);
}, isSameSlot);

export function rectStyleOf(rect: PaneRect): CSSProperties {
	return {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height,
	};
}

function isSameSlot(before: PaneSlotProps, after: PaneSlotProps): boolean {
	return (
		before.leaf === after.leaf &&
		before.drawn === after.drawn &&
		before.onFocused === after.onFocused &&
		isSameLook(before.look, after.look)
	);
}

function isSameLook(before: SlotLook, after: SlotLook): boolean {
	return (
		before.isAtTopLeft === after.isAtTopLeft &&
		before.isAtTopRight === after.isAtTopRight &&
		before.isDimmed === after.isDimmed &&
		before.isMoving === after.isMoving &&
		before.isAway === after.isAway &&
		before.corners === after.corners &&
		before.rim === after.rim &&
		isSamePlace(before.place, after.place)
	);
}

function isSamePlace(before: PanePlace, after: PanePlace): boolean {
	return (
		before.left === after.left &&
		before.top === after.top &&
		before.width === after.width &&
		before.height === after.height
	);
}
