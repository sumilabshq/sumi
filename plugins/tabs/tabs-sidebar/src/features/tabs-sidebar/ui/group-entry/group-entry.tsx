import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { SidebarMenuButton, SidebarMenuChevron, SidebarMenuItem, SidebarMenuSub } from "@widgetarium/kit";
import { groups } from "@sumi/groups/contract";
import type { SidebarGroupState } from "@widgetarium/app-host/contract";
import { groupColourOf, openGroupMenu } from "@sumi/tab-strip-plugin";
import type { TabActs } from "@sumi/tab-strip-plugin";
import { GROUP_ROW } from "../../lib/sidebar-drops.js";
import { TabEntry } from "../tab-entry/tab-entry.js";

export interface GroupEntryProps {
	readonly group: SidebarGroupState;
	readonly list: string;
	readonly acts: TabActs;
	readonly draggedId: string | null;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

const FOLDER_PX = 16;
const FOLDER_VIEW_BOX = "0 0 24 24";
const FOLDER_GLYPH = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";

export function GroupEntry({ group, list, acts, draggedId, onMenu }: GroupEntryProps): ReactElement {
	const fold = useCommand(groups.actions.fold);
	const isOpen = group.isOpen || group.items.some(({ tab }) => tab.id === draggedId);
	return (
		<SidebarMenuItem role="presentation">
			<SidebarMenuButton
				size="sm"
				data-sort-id={`${GROUP_ROW}${group.id}`}
				data-sort-into=""
				data-sort-fixed=""
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
				<SidebarMenuSub role="presentation">
					{group.items.map(({ tab }) => (
						<TabEntry
							key={tab.id}
							item={{
								kind: "tab",
								tab,
								list,
								groupId: group.id,
								group: {
									id: group.id,
									name: group.name,
									hue: group.hue,
									isOpen: group.isOpen,
								},
							}}
							acts={acts}
							isSub
							isPlaceholder={tab.id === draggedId}
							onMenu={onMenu}
						/>
					))}
				</SidebarMenuSub>
			) : null}
		</SidebarMenuItem>
	);
}
