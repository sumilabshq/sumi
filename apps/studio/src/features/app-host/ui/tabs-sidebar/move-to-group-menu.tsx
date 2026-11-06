import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/framework";
import { ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, Icon } from "@widgetarium/kit";
import { PlaceTabCommand } from "@widgetarium/app-host";
import type { GroupFace } from "../../lib/tabs-sidebar/sidebar-groups.js";
import { POINTER_ITEM, POINTER_SUBMENU } from "../../lib/menu-look/menu-look.js";

export interface MoveToGroupMenuProps {
	readonly tabId: string;
	readonly list: string;
	readonly groups: readonly GroupFace[];
}

export function MoveToGroupMenu({ tabId, list, groups }: MoveToGroupMenuProps): ReactElement {
	const placeTab = useCommand(PlaceTabCommand);
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				className={POINTER_ITEM}
				disabled={groups.length === 0}
				data-tabs-menu-item="Move to group"
			>
				<Icon name="folder-input" size={16} />
				<span className="cv:flex-1">Move to group</span>
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className={POINTER_SUBMENU}>
				{groups.map((group) => (
					<ContextMenuItem
						key={group.id}
						className={POINTER_ITEM}
						onSelect={() =>
							void placeTab.run({
								id: tabId,
								to: {
									kind: "list",
									list,
									groupId: group.id,
									before: null,
								},
							})
						}
						data-tabs-move-to={group.id}
					>
						{group.name}
					</ContextMenuItem>
				))}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
