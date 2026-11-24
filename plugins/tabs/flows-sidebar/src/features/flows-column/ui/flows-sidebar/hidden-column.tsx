import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PeekHoldContext } from "../../../../shared/lib/peek-hold.js";
import { useLingering } from "../../lib/use-lingering.js";
import { useRevealIntent } from "../../lib/use-reveal-intent.js";
import { useSidebarWidth } from "../../lib/use-sidebar-width.js";
import { SidebarBody } from "./sidebar-body.js";

const FLOWS = "Flows";
const PEEK_OUT_MS = 70;

export interface HiddenColumnProps {
	readonly isPeeking: boolean;
}

export function HiddenColumn({ isPeeking }: HiddenColumnProps): ReactElement {
	const width = useSidebarWidth();
	const intent = useRevealIntent();
	const peek = useLingering(isPeeking, PEEK_OUT_MS);
	return (
		<div className="wg-root sumi-flows-hidden">
			<div className="sumi-flows-edge" onPointerEnter={intent.onEnter} onPointerLeave={intent.onLeave} />
			{peek.isDrawn ? (
				<aside
					ref={intent.panel}
					className="sumi-flows-float"
					data-leaving={peek.isLeaving ? "" : undefined}
					style={{ width: width.px }}
					aria-label={FLOWS}
					onPointerEnter={intent.onEnter}
					onPointerLeave={intent.onLeave}
				>
					<PeekHoldContext.Provider value={intent.hold}>
						<SidebarBody />
					</PeekHoldContext.Provider>
				</aside>
			) : null}
		</div>
	);
}
