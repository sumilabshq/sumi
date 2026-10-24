import { createElement as h, useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { ContextMenu, ContextMenuTrigger } from "@widgetarium/kit";
import { EssentialsGrid } from "../essentials-grid/essentials-grid.js";
import { GroupMenu } from "../group-menu/group-menu.js";
import { CanOpenOwnWindowQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import type { GroupState, TabSection } from "@widgetarium/app-host";
import { NewTabRow } from "./new-tab-row.js";
import { PointerMenu } from "./pointer-menu.js";
import { TabSections } from "./tab-sections.js";
import { useDropPlacing } from "../../lib/tabs-sidebar/use-drop-placing.js";
import { useGroupHead } from "../../lib/tabs-sidebar/use-group-head.js";
import { usePointedMenus } from "../../lib/tabs-sidebar/use-pointed-menus.js";

const TABS = "Tabs";
const SIDEBAR =
	"cv:flex cv:h-full cv:min-h-0 cv:w-full cv:flex-col cv:[&,&_*]:box-border cv:gap-px cv:font-[family-name:var(--sumi-font-ui)] cv:text-[13px] cv:leading-[1.4] cv:text-(--sumi-text) cv:antialiased cv:[font-feature-settings:'cv11','ss03']";
const SCROLLER =
	"cv:-mx-1 cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-px cv:overflow-y-auto cv:px-1 cv:pb-2 cv:[scrollbar-width:none]";

export function TabsSidebar(): ReactElement {
	const { essentials, sections, listTargets, workspaceList } = useQuery(TabsSidebarQuery).data;
	const holder = useRef<HTMLElement | null>(null);
	const { pointed, groupMenuId, openGroupMenu, onContextMenu } = usePointedMenus(workspaceList);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const onRenamed = useCallback(() => setRenamingId(null), []);
	useDropPlacing(holder, useQuery(CanOpenOwnWindowQuery).data);
	const groupHead = useGroupHead(holder, groupMenuId, sections);
	const menuGroup = groupStateOf(sections, groupMenuId);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={onContextMenu}>
				<aside ref={holder} className={SIDEBAR} aria-label={TABS} data-tabs-sidebar="" data-tabs-in={workspaceList}>
					<EssentialsGrid tiles={essentials} />
					<div className={SCROLLER} data-host-column-scroll="">
						<TabSections
							sections={sections}
							renamingId={renamingId}
							onRenamed={onRenamed}
							onGroupMade={openGroupMenu}
						/>
					</div>
					<NewTabRow />
				</aside>
			</ContextMenuTrigger>
			<PointerMenu
				pointed={pointed}
				sections={sections}
				listTargets={listTargets}
				essentials={essentials}
				onRename={setRenamingId}
				onGroupMade={openGroupMenu}
			/>
			<GroupMenu group={menuGroup} anchor={menuGroup === null ? null : groupHead} onClose={() => openGroupMenu(null)} />
		</ContextMenu>
	);
}

function groupStateOf(sections: readonly TabSection[], id: string | null): GroupState | null {
	const found = sections
		.flatMap((section) => section.entries)
		.find((entry) => entry.kind === "group" && entry.group.id === id);
	return found?.kind === "group" ? found.group : null;
}
