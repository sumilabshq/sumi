import { createElement as h, useCallback, useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { ContextMenu, ContextMenuTrigger } from "@widgetarium/kit";
import { EssentialsGrid } from "../../../features/essentials/ui/essentials-grid/essentials-grid.js";
import { GroupMenu } from "../../../features/groups/ui/group-menu/group-menu.js";
import { TabsSidebarQuery } from "../../../features/tabs/contract.js";
import { pointedOf } from "../../lib/tabs-sidebar/pointed-of.js";
import type { GroupState, SidebarEntry } from "../../schema/app-tab.schema.js";
import { NewTabRow } from "./new-tab-row.js";
import { PointerMenu } from "./pointer-menu.js";
import type { Pointed } from "./pointer-menu.js";
import { SectionHead } from "./section-head.js";
import { SidebarList } from "./sidebar-list.js";
import { useDropPlacing } from "../../lib/tabs-sidebar/use-drop-placing.js";
import { useGroupHead } from "../../lib/tabs-sidebar/use-group-head.js";

const TABS = "Tabs";
const SIDEBAR =
	"cv:flex cv:h-full cv:min-h-0 cv:w-full cv:flex-col cv:[&,&_*]:box-border cv:gap-px cv:font-[family-name:var(--sumi-font-ui)] cv:text-[13px] cv:leading-[1.4] cv:text-(--sumi-text) cv:antialiased cv:[font-feature-settings:'cv11','ss03']";
const SCROLLER =
	"cv:-mx-1 cv:flex cv:min-h-0 cv:flex-1 cv:flex-col cv:gap-px cv:overflow-y-auto cv:px-1 cv:pb-2 cv:[scrollbar-width:none]";

export function TabsSidebar(): ReactElement {
	const { chat, essentials, entries, isListOpen } = useQuery(TabsSidebarQuery).data;
	const holder = useRef<HTMLElement | null>(null);
	const [pointed, setPointed] = useState<Pointed>({ kind: "space" });
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [groupMenuId, setGroupMenuId] = useState<string | null>(null);
	const onRenamed = useCallback(() => setRenamingId(null), []);
	useDropPlacing(holder);
	const groupHead = useGroupHead(holder, groupMenuId, entries);
	const onContextMenu = (event: MouseEvent<HTMLElement>): void => {
		const item = pointedOf(event.target);

		if (item.kind === "group") {
			event.preventDefault();
			setGroupMenuId(item.id);
			return;
		}

		setPointed(item);
	};
	const menuGroup = groupStateOf(entries, groupMenuId);
	const count = entries.reduce((sum, entry) => sum + (entry.kind === "tab" ? 1 : entry.group.tabs.length), 0);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={onContextMenu}>
				<aside ref={holder} className={SIDEBAR} aria-label={TABS} data-tabs-sidebar="">
					<EssentialsGrid tiles={essentials} />
					<div className={SCROLLER} data-host-column-scroll="">
						<SectionHead title={chat.title} isOpen={isListOpen} count={count} onGroupMade={setGroupMenuId} />
						{isListOpen ? <SidebarList entries={entries} renamingId={renamingId} onRenamed={onRenamed} /> : null}
					</div>
					<NewTabRow />
				</aside>
			</ContextMenuTrigger>
			<PointerMenu
				pointed={pointed}
				entries={entries}
				essentials={essentials}
				onRename={setRenamingId}
				onGroupMade={setGroupMenuId}
			/>
			<GroupMenu
				group={menuGroup}
				anchor={menuGroup === null ? null : groupHead}
				onClose={() => setGroupMenuId(null)}
			/>
		</ContextMenu>
	);
}

function groupStateOf(entries: readonly SidebarEntry[], id: string | null): GroupState | null {
	const found = entries.find((entry) => entry.kind === "group" && entry.group.id === id);
	return found?.kind === "group" ? found.group : null;
}
