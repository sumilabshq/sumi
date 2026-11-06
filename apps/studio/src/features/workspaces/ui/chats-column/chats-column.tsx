import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Slot } from "@widgetarium/data-framework";
import { TipSurface } from "../../../canvas/ui/tip-surface/tip-surface.js";
import { TabsSidebar } from "../../../app-host/ui/tabs-sidebar/tabs-sidebar.js";
import { WorkspaceHeader } from "../workspace-header/workspace-header.js";
import { WorkspaceKeys } from "../workspace-keys/workspace-keys.js";
import { WorkspaceStrip } from "../workspace-strip/workspace-strip.js";
import { ColumnTop } from "./column-top.js";
import { OpeningVeil } from "./opening-veil.js";
import { SidebarKeys } from "./sidebar-keys.js";

const COLUMN_LABEL = "Sidebar";

export function ChatsColumn(): ReactElement {
	const column = useRef<HTMLElement | null>(null);
	return (
		<TipSurface>
			<nav ref={column} className="wg-ws-column wg-root" aria-label={COLUMN_LABEL} data-ws-column="">
				<Slot loading={null}>
					<OpeningVeil>
						<ColumnTop />
						<WorkspaceHeader />
						<TabsSidebar />
					</OpeningVeil>
					<WorkspaceStrip />
					<WorkspaceKeys />
				</Slot>
				<Slot loading={null}>
					<SidebarKeys column={column} />
				</Slot>
			</nav>
		</TipSurface>
	);
}
