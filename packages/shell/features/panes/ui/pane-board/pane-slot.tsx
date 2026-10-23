import { createElement as h, memo, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PaneCloseContext } from "../../../../shared/lib/pane-close-context.js";
import type { PanePlace, PaneRect } from "../../../../shared/lib/pane-layout.js";
import type { PaneLeaf, PaneView } from "../../../../shared/schema/pane-tree.schema.js";
import { AimPaneCommand, ClosePaneCommand } from "../../contract.js";

export interface PaneSlotProps {
	readonly leaf: PaneLeaf;
	readonly place: PanePlace;
	readonly isAtTopLeft: boolean;
	readonly isAtTopRight: boolean;
	readonly isDimmed: boolean;
	readonly drawn: (view: PaneView) => ReactNode;
}

export const PaneSlot = memo(function PaneSlot({
	leaf,
	place,
	isAtTopLeft,
	isAtTopRight,
	isDimmed,
	drawn,
}: PaneSlotProps): ReactElement {
	const closePane = useCommand(ClosePaneCommand);
	const aimPane = useCommand(AimPaneCommand);
	const closing = useMemo(
		() => ({
			paneId: leaf.id,
			isAtTopLeft,
			isAtTopRight,
			close: () => void closePane.run({ id: leaf.id }),
		}),
		[closePane, leaf.id, isAtTopLeft, isAtTopRight],
	);
	return (
		<div
			className="wg-pane"
			style={{
				left: place.left,
				top: place.top,
				width: place.width,
				height: place.height,
			}}
			data-pane-id={leaf.id}
			data-pane-view={leaf.view.kind}
			data-pane-dimmed={isDimmed ? "" : undefined}
			onPointerDownCapture={leaf.view.kind === "app" ? () => void aimPane.run({ id: leaf.id }) : undefined}
			onWheelCapture={leaf.view.kind === "app" && isDimmed ? () => void aimPane.run({ id: leaf.id }) : undefined}
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
		before.isAtTopLeft === after.isAtTopLeft &&
		before.isAtTopRight === after.isAtTopRight &&
		before.isDimmed === after.isDimmed &&
		before.drawn === after.drawn &&
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
