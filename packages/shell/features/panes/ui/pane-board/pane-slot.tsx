import { createElement as h, memo, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PaneCloseContext } from "../../../../shared/lib/pane-close-context.js";
import type { PaneRect } from "../../../../shared/lib/pane-layout.js";
import type { PaneLeaf, PaneView } from "../../../../shared/schema/pane-tree.schema.js";
import { AimPaneCommand, ClosePaneCommand } from "../../contract.js";

export interface PaneSlotProps {
	readonly leaf: PaneLeaf;
	readonly rect: PaneRect;
	readonly isAtTopLeft: boolean;
	readonly isAtTopRight: boolean;
	readonly isDimmed: boolean;
	readonly drawn: (view: PaneView) => ReactNode;
}

export const PaneSlot = memo(function PaneSlot({
	leaf,
	rect,
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
			style={rectStyleOf(rect)}
			data-pane-id={leaf.id}
			data-pane-view={leaf.view.kind}
			data-pane-dimmed={isDimmed ? "" : undefined}
			onPointerDownCapture={leaf.view.kind === "app" ? () => void aimPane.run({ id: leaf.id }) : undefined}
			onWheelCapture={leaf.view.kind === "app" && isDimmed ? () => void aimPane.run({ id: leaf.id }) : undefined}
		>
			<PaneCloseContext.Provider value={closing}>{drawn(leaf.view)}</PaneCloseContext.Provider>
		</div>
	);
});

export function rectStyleOf(rect: PaneRect): CSSProperties {
	return {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height,
	};
}
