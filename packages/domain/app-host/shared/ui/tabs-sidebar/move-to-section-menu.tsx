import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, Icon } from "@widgetarium/kit";
import { MoveTabToListCommand } from "../../../features/tabs/contract.js";
import { POINTER_ITEM, POINTER_SUBMENU } from "../../lib/menu-look/menu-look.js";
import type { ListTarget } from "../../schema/app-tab.schema.js";

export interface MoveToSectionMenuProps {
	readonly tabId: string;
	readonly list: string;
	readonly targets: readonly ListTarget[];
}

const MOVE_TO_SECTION = "Move to section";
const WORKSPACE_SECTION = "Workspace";

export function MoveToSectionMenu({ tabId, list, targets }: MoveToSectionMenuProps): ReactElement {
	const moveTab = useCommand(MoveTabToListCommand);
	const others = targets.filter((target) => target.list !== list);
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				className={POINTER_ITEM}
				disabled={others.length === 0}
				data-tabs-menu-item={MOVE_TO_SECTION}
			>
				<Icon name="layers" size={16} />
				<span className="cv:flex-1">{MOVE_TO_SECTION}</span>
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className={POINTER_SUBMENU}>
				{others.map((target) => (
					<ContextMenuItem
						key={target.list}
						className={POINTER_ITEM}
						onSelect={() =>
							void moveTab.run({
								id: tabId,
								list: target.list,
							})
						}
						data-tabs-move-to-list={target.list}
					>
						<Icon name={target.owner === "workspace" ? "layers" : "message-square"} size={16} />
						{target.owner === "workspace" ? WORKSPACE_SECTION : target.title}
					</ContextMenuItem>
				))}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
