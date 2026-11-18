import { createElement as h } from "react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import {
	SidebarMenuButton,
	SidebarMenuChevron,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
} from "@widgetarium/kit";
import { groups } from "@sumi/groups/contract";
import type { SidebarGroupState } from "@widgetarium/app-host/contract";
import { groupColourOf, openGroupMenu, stripGroupOf } from "@sumi/tab-strip-plugin";
import type { TabActs } from "@sumi/tab-strip-plugin";
import { GROUP_ROW, sortIdOf } from "../../lib/sidebar-drops.js";
import { TabEntry } from "../tab-entry/tab-entry.js";

export interface GroupEntryProps {
	readonly group: SidebarGroupState;
	readonly list: string;
	readonly acts: TabActs;
	readonly draggedId: string | null;
	readonly depth: number;
	readonly isLifted: boolean;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

const FOLDER_PX = 16;
const FOLDER_VIEW_BOX = "0 0 24 24";
const FOLDER_GLYPH = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";

export function GroupEntry({ group, list, acts, draggedId, depth, isLifted, onMenu }: GroupEntryProps): ReactElement {
	const fold = useCommand(groups.actions.fold);
	const sortId = `${GROUP_ROW}${group.id}`;
	const isPlaceholder = isLifted || sortId === draggedId;
	const isOpen = group.isOpen || group.items.some((item) => sortIdOf(item) === draggedId);
	const Holder = depth === 0 ? SidebarMenuItem : SidebarMenuSubItem;
	const inner: CSSProperties & Readonly<Record<"--sumi-tabs-depth", number>> = {
		"--sumi-tabs-depth": depth + 1,
	};
	return (
		<Holder role="presentation" data-sort-block={sortId}>
			<SidebarMenuButton
				size="sm"
				data-sort-id={sortId}
				data-sort-into={isOpen && group.items.length > 0 ? undefined : ""}
				data-sort-placeholder={isPlaceholder ? "" : undefined}
				aria-expanded={isOpen}
				data-group-anchor={group.id}
				onClick={() => void fold.run({ id: group.id })}
				onContextMenu={(event) => {
					event.preventDefault();
					openGroupMenu(group.id);
				}}
			>
				<svg
					className="sumi-tabs-sidebar-folder"
					width={FOLDER_PX}
					height={FOLDER_PX}
					viewBox={FOLDER_VIEW_BOX}
					style={{ color: groupColourOf(group.hue) }}
					aria-hidden="true"
				>
					<path d={FOLDER_GLYPH} />
				</svg>
				<span className="sumi-tabs-sidebar-title" style={group.hue === null ? undefined : { color: groupColourOf(group.hue) }}>
					{group.name}
				</span>
				<SidebarMenuChevron isOpen={isOpen} />
			</SidebarMenuButton>
			{isOpen ? (
				<SidebarMenuSub role="presentation" style={inner}>
					{group.items.map((item) =>
						item.kind === "group" ? (
							<GroupEntry
								key={item.group.id}
								group={item.group}
								list={list}
								acts={acts}
								draggedId={draggedId}
								depth={depth + 1}
								isLifted={isPlaceholder}
								onMenu={onMenu}
							/>
						) : (
							<TabEntry
								key={item.tab.id}
								item={{
									kind: "tab",
									tab: item.tab,
									list,
									groupId: group.id,
									group: stripGroupOf(group),
								}}
								acts={acts}
								isSub
								isPlaceholder={isPlaceholder || item.tab.id === draggedId}
								onMenu={onMenu}
							/>
						),
					)}
				</SidebarMenuSub>
			) : null}
		</Holder>
	);
}
