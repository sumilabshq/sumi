import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Sidebar, SidebarRail } from "@widgetarium/kit";
import { useSidebarWidth } from "../../lib/use-sidebar-width.js";
import { SidebarBody } from "./sidebar-body.js";

const FLOWS = "Flows";

export function DockedColumn(): ReactElement {
	const width = useSidebarWidth();
	return (
		<div className="wg-root sumi-flows-column">
			<Sidebar
				as="aside"
				side="left"
				variant="sidebar"
				collapsible="none"
				surface="chrome"
				className="sumi-flows-sidebar"
				style={{ width: width.px }}
				aria-label={FLOWS}
			>
				<SidebarBody />
			</Sidebar>
			<SidebarRail widthPx={width.px} onWidth={width.onWidth} onWidthDone={width.onWidthDone} />
		</div>
	);
}
