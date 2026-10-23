import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import type { PaneRect } from "../../../../shared/lib/pane-layout.js";
import type { PaneLeaf, PaneView } from "../../../../shared/schema/pane-tree.schema.js";
import { PaneSlot } from "./pane-slot.js";

export interface PaneWithEdgeProps {
	readonly leaf: PaneLeaf;
	readonly rect: PaneRect;
	readonly hasRight: boolean;
	readonly chatEdge: ReactNode;
	readonly drawn: (view: PaneView) => ReactNode;
}

export function PaneWithEdge({ leaf, rect, hasRight, chatEdge, drawn }: PaneWithEdgeProps): ReactElement {
	return (
		<Fragment>
			<PaneSlot leaf={leaf} rect={rect} drawn={drawn} />
			{hasRight ? (
				<div className="wg-pane-edge" style={edgeStyleOf(rect)}>
					{chatEdge}
				</div>
			) : null}
		</Fragment>
	);
}

function edgeStyleOf(rect: PaneRect): { readonly left: number; readonly top: number; readonly height: number } {
	return {
		left: rect.left + rect.width,
		top: rect.top,
		height: rect.height,
	};
}
