import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useRevealIntent } from "../../lib/use-reveal-intent.js";
import { useSidebarWidth } from "../../lib/use-sidebar-width.js";
import { SidebarBody } from "./sidebar-body.js";

const FLOWS = "Flows";

export interface HiddenColumnProps {
	readonly isPeeking: boolean;
}

export function HiddenColumn({ isPeeking }: HiddenColumnProps): ReactElement {
	const width = useSidebarWidth();
	const intent = useRevealIntent();
	return (
		<div className="wg-root sumi-flows-hidden">
			<div className="sumi-flows-edge" onPointerEnter={intent.onEnter} onPointerLeave={intent.onLeave} />
			{isPeeking ? (
				<aside
					ref={intent.panel}
					className="sumi-flows-float"
					style={{ width: width.px }}
					aria-label={FLOWS}
					onPointerEnter={intent.onEnter}
					onPointerLeave={intent.onLeave}
				>
					<SidebarBody />
				</aside>
			) : null}
		</div>
	);
}
