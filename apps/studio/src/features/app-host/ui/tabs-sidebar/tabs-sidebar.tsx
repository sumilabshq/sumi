import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { ContextMenu, ContextMenuTrigger } from "@widgetarium/kit";
import { CanOpenOwnWindowQuery, SectionListSchema, TabsSidebarQuery } from "@widgetarium/app-host";
import { EssentialsGrid } from "../essentials-grid/essentials-grid.js";
import { GroupMenu } from "../group-menu/group-menu.js";
import { NewTabRow } from "./new-tab-row.js";
import { PointerMenu } from "./pointer-menu.js";
import { SidebarSection } from "./sidebar-section.js";
import { groupFaceOf } from "../../lib/tabs-sidebar/sidebar-groups.js";
import { useDropPlacing } from "../../lib/tabs-sidebar/use-drop-placing.js";
import { useGroupHead } from "../../lib/tabs-sidebar/use-group-head.js";
import { usePointedMenus } from "../../lib/tabs-sidebar/use-pointed-menus.js";
import { useRowRenaming } from "../../lib/tabs-sidebar/use-row-renaming.js";

const TABS = "Tabs";
const WORKSPACE_LIST = SectionListSchema.enum.workspace;
const SIDEBAR =
	"cv:flex cv:min-h-0 cv:w-full cv:flex-1 cv:flex-col cv:[&,&_*]:box-border cv:gap-px cv:font-[family-name:var(--sumi-font-ui)] cv:text-[13px] cv:leading-[1.4] cv:text-(--sumi-text) cv:antialiased cv:[font-feature-settings:'cv11','ss03']";
const SCROLLER =
	"cv:-mx-1 cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-px cv:overflow-y-auto cv:px-1 cv:pb-2 cv:[scrollbar-width:none]";

export function TabsSidebar(): ReactElement {
	const sidebar = useQuery(TabsSidebarQuery).data;
	const holder = useRef<HTMLElement | null>(null);
	const { pointed, groupMenuId, openGroupMenu, onContextMenu } = usePointedMenus();
	const { renaming, startRenaming } = useRowRenaming();
	useDropPlacing(holder, useQuery(CanOpenOwnWindowQuery).data);
	const groupHead = useGroupHead(holder, groupMenuId, sidebar);
	const menuGroup = groupFaceOf(sidebar, groupMenuId);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={onContextMenu}>
				<aside ref={holder} className={SIDEBAR} aria-label={TABS} data-tabs-sidebar="" data-tabs-in={WORKSPACE_LIST}>
					<NewTabRow list={sidebar.newTabList} />
					<EssentialsGrid tiles={sidebar.essentials} />
					<div className={SCROLLER} data-host-column-scroll="">
						{sidebar.sections.map((section) => (
							<SidebarSection key={section.list} section={section} renaming={renaming} />
						))}
					</div>
				</aside>
			</ContextMenuTrigger>
			<PointerMenu pointed={pointed} sidebar={sidebar} onRename={startRenaming} onGroupMade={openGroupMenu} />
			<GroupMenu group={menuGroup} anchor={menuGroup === null ? null : groupHead} onClose={() => openGroupMenu(null)} />
		</ContextMenu>
	);
}
