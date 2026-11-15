import { createElement as h, useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { TabMenuFor } from "@sumi/tab-strip-plugin";
import type { TabMenuAsk } from "@sumi/tab-strip-plugin";
import { pointedOf } from "../../lib/tabs-sidebar/pointed-of.js";
import { useQuery } from "@widgetarium/data-framework";
import { ContextMenu, ContextMenuTrigger } from "@widgetarium/kit";
import { SidebarActions } from "@sumi/sumi-host-plugin";
import { SectionListSchema, appHost } from "@widgetarium/app-host/contract";
import { EssentialsGrid } from "../essentials-grid/essentials-grid.js";
import { FlipLayout } from "../flip-layout/flip-layout.js";
import { NewTabRow } from "./new-tab-row.js";
import { PointerMenu } from "./pointer-menu.js";
import { SidebarSection } from "./sidebar-section.js";
import { LiftedContext } from "../../lib/tab-drag/lifted-look.js";
import { useSidebarDragParts } from "../../lib/tab-drag/sidebar-drag-parts.js";
import { useArrangedSidebar } from "../../lib/tabs-sidebar/use-arranged-sidebar.js";
import { useDropPlacing } from "../../lib/tabs-sidebar/use-drop-placing.js";
import { usePointedMenus } from "../../lib/tabs-sidebar/use-pointed-menus.js";
import { useFeedsPendingMoves } from "../../lib/tabs-sidebar/use-feeds-pending-moves.js";
import { SidebarMovesContext } from "../../lib/tab-drag/pending-moves.js";
import { useRowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

const TABS = "Tabs";
const WORKSPACE_LIST = SectionListSchema.enum.workspace;
const PINNED_LIST = SectionListSchema.enum.pinned;
const SIDEBAR =
	"cv:flex cv:min-h-0 cv:w-full cv:flex-1 cv:flex-col cv:[&,&_*]:box-border cv:font-[family-name:var(--sumi-font-ui)] cv:text-[13px] cv:leading-[1.5] cv:text-(--sumi-text) cv:antialiased";
const SCROLLER =
	"cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:overflow-x-hidden cv:overflow-y-auto cv:pb-2 cv:[scrollbar-width:none]";

export function TabsSidebar(): ReactElement {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const holder = useRef<HTMLElement | null>(null);
	const drag = useSidebarDragParts();
	const { preview, shown, lifted } = useArrangedSidebar(drag, sidebar);
	const { pointed, onContextMenu } = usePointedMenus();
	const { renaming, startRenaming } = useRowRenaming();
	const [tabMenu, setTabMenu] = useState<TabMenuAsk | null>(null);
	const onMenu = (event: MouseEvent<HTMLElement>): void => {
		const pointedNow = pointedOf(event.target);

		if (pointedNow.kind !== "tab" && pointedNow.kind !== "split") {
			onContextMenu(event);
			return;
		}

		event.preventDefault();
		setTabMenu({ id: pointedNow.id, x: event.clientX, y: event.clientY });
	};
	useDropPlacing(holder, useQuery(appHost.tabs.canOpenOwnWindow).data, drag);
	useFeedsPendingMoves(drag, sidebar);
	return (
		<FlipLayout
			holder={holder}
			motion={drag.motion}
			isArranging={preview !== null}
			onLaidOut={() => drag.laidOut.measure(holder.current)}
		>
			<ContextMenu>
				<ContextMenuTrigger asChild onContextMenu={onMenu}>
					<aside
						ref={holder}
						className={SIDEBAR}
						aria-label={TABS}
						data-tabs-sidebar=""
						data-tabs-in={WORKSPACE_LIST}
						data-tabs-arranging={preview === null ? undefined : ""}
					>
						<LiftedContext.Provider value={lifted}>
							<EssentialsGrid tiles={shown.essentials} isHeld={preview?.source.kind === "essential"} />
							<SidebarActions />
							<div className={SCROLLER} data-host-column-scroll="">
								{shown.sections.map((section) => (
									<SidebarSection
										key={section.list}
										section={section}
										renaming={renaming}
										isShown={section.list !== PINNED_LIST || section.entries.length > 0 || preview !== null}
										last={section.list === WORKSPACE_LIST ? <NewTabRow list={sidebar.newTabList} /> : null}
									/>
								))}
							</div>
						</LiftedContext.Provider>
					</aside>
				</ContextMenuTrigger>
				<SidebarMovesContext.Provider value={drag.pending}>
					<PointerMenu pointed={pointed} sidebar={shown} onRename={startRenaming} />
				</SidebarMovesContext.Provider>
			</ContextMenu>
			<TabMenuFor ask={tabMenu} onClose={() => setTabMenu(null)} />
		</FlipLayout>
	);
}
