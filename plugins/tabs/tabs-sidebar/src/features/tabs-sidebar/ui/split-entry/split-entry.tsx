import { createElement as h } from "react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import {
	Icon,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	TileMap,
} from "@widgetarium/kit";
import { TabIcons } from "@sumi/tab-strip-plugin";
import type { StripSplit, TabActs } from "@sumi/tab-strip-plugin";
import { tabItemOf } from "../../lib/entry-items.js";
import { SPLIT_ROW } from "../../lib/sidebar-drops.js";
import { TabEntry } from "../tab-entry/tab-entry.js";

export interface SplitEntryProps {
	readonly item: StripSplit;
	readonly acts: TabActs;
	readonly draggedId: string | null;
	readonly isSub?: boolean;
	readonly depth?: number;
	readonly isLifted?: boolean;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

const CLOSE_PX = 14;
const CLOSE_SPLIT = "Close split";
const SPLIT = "Split";
const JOINER = " + ";

export function SplitEntry({
	item,
	acts,
	draggedId,
	isSub = false,
	depth = 0,
	isLifted = false,
	onMenu,
}: SplitEntryProps): ReactElement {
	const { split, list } = item;
	const sortId = `${SPLIT_ROW}${split.id}`;
	const isPlaceholder = isLifted || sortId === draggedId;
	const Holder = isSub ? SidebarMenuSubItem : SidebarMenuItem;
	const inner: CSSProperties & Readonly<Record<"--side-depth", number>> = {
		"--side-depth": depth + 1,
	};
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
		<Holder role="presentation" data-sort-block={sortId}>
			<SidebarMenuButton
				size="sm"
				role="tab"
				data-sort-id={sortId}
				data-sort-into=""
				data-sort-placeholder={isPlaceholder ? "" : undefined}
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
				<SidebarMenuSub role="presentation" style={inner}>
					{split.members.map(({ item: member }) => (
						<TabEntry
							key={member.tab.id}
							item={tabItemOf(member.tab, list)}
							acts={acts}
							isSub
							isPlaceholder={isPlaceholder || member.tab.id === draggedId}
							subPages={member.subPages}
							isFolded={member.isFolded}
							depth={depth + 1}
							draggedId={draggedId}
							onMenu={onMenu}
						/>
					))}
				</SidebarMenuSub>
			) : null}
		</Holder>
	);
}
