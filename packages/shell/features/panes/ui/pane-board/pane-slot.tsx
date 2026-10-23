import { createElement as h, memo, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PaneCloseContext } from "../../../../shared/lib/pane-close-context.js";
import type { PaneRect } from "../../../../shared/lib/pane-layout.js";
import type { PaneLeaf, PaneView } from "../../../../shared/schema/pane-tree.schema.js";
import { ClosePaneCommand } from "../../contract.js";

export interface PaneSlotProps {
	readonly leaf: PaneLeaf;
	readonly rect: PaneRect;
	readonly drawn: (view: PaneView) => ReactNode;
}

export const PaneSlot = memo(function PaneSlot({ leaf, rect, drawn }: PaneSlotProps): ReactElement {
	const closePane = useCommand(ClosePaneCommand);
	const closing = useMemo(
		() => ({
			paneId: leaf.id,
			close: () => void closePane.run({ id: leaf.id }),
		}),
		[closePane, leaf.id],
	);
	return (
		<div className="wg-pane" style={rectStyleOf(rect)} data-pane-id={leaf.id} data-pane-view={leaf.view.kind}>
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
