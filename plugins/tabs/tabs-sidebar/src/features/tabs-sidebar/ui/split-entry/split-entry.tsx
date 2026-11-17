import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, TileMap } from "@widgetarium/kit";
import { TabIcons } from "@sumi/tab-strip-plugin";
import type { StripSplit, TabActs } from "@sumi/tab-strip-plugin";
import { tabItemOf } from "../../lib/entry-items.js";
import { SPLIT_ROW } from "../../lib/sidebar-drops.js";
import { TabEntry } from "../tab-entry/tab-entry.js";

export interface SplitEntryProps {
	readonly item: StripSplit;
	readonly acts: TabActs;
	readonly draggedId: string | null;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

const CLOSE_PX = 14;
const CLOSE_SPLIT = "Close split";
const SPLIT = "Split";
const JOINER = " + ";

export function SplitEntry({ item, acts, draggedId, onMenu }: SplitEntryProps): ReactElement {
	const { split, list } = item;
	const isOpen = split.isShown || split.members.some(({ item: member }) => member.tab.id === draggedId);
	const map = (
		<TileMap
			cells={split.map.cells.map((cell) => ({
				id: cell.tabId,
				x: cell.x,
				y: cell.y,
				w: cell.w,
				h: cell.h,
			}))}
			markedId={split.map.markedId}
		/>
	);
	return (
		<SidebarMenuItem role="presentation">
			<SidebarMenuButton
				size="sm"
				role="tab"
				data-sort-id={`${SPLIT_ROW}${split.id}`}
				data-sort-into=""
				data-sort-fixed=""
				aria-selected={split.isShown}
				isActive={split.isShown && !isOpen}
				onClick={() => acts.show(item)}
				onContextMenu={(event) => {
					event.preventDefault();
					onMenu(split.id, event);
				}}
			>
				{isOpen ? map : <TabIcons item={item} />}
				<span className="sumi-tabs-sidebar-title">
					{isOpen ? SPLIT : split.members.map(({ item: member }) => member.tab.title).join(JOINER)}
				</span>
				{isOpen ? null : map}
			</SidebarMenuButton>
			<SidebarMenuAction showOnHover label={CLOSE_SPLIT} onClick={() => acts.close(item)}>
				<Icon name="x" size={CLOSE_PX} />
			</SidebarMenuAction>
			{isOpen ? (
				<SidebarMenuSub role="presentation">
					{split.members.map(({ item: member }) => (
						<TabEntry
							key={member.tab.id}
							item={tabItemOf(member.tab, list)}
							acts={acts}
							isSub
							isPlaceholder={member.tab.id === draggedId}
							onMenu={onMenu}
						/>
					))}
				</SidebarMenuSub>
			) : null}
		</SidebarMenuItem>
	);
}
