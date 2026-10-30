import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ContextMenuGroup, ContextMenuSeparator } from "@widgetarium/kit";
import { CloseTabCommand, CreateGroupCommand, PinTabCommand, SectionListSchema } from "@widgetarium/app-host";
import { POINTER_LINE } from "../../lib/menu-look/menu-look.js";
import { groupsOfList } from "../../lib/tabs-sidebar/sidebar-groups.js";
import { AddToEssentialsItem } from "./add-to-essentials-item.js";
import { MoveToGroupMenu } from "./move-to-group-menu.js";
import { PointerItem } from "./pointer-item.js";
import type { Pointed, PointerMenuProps } from "./pointer-menu.js";

const PINNED_LIST = SectionListSchema.enum.pinned;

export function TabItems({
	pointed,
	sidebar,
	onRename,
	onGroupMade,
}: PointerMenuProps & { readonly pointed: Extract<Pointed, { kind: "tab" }> }): ReactElement {
	const pinTab = useCommand(PinTabCommand);
	const newGroup = useCommand(CreateGroupCommand);
	const closeTab = useCommand(CloseTabCommand);
	const isPinned = pointed.list === PINNED_LIST;
	const groups = groupsOfList(sidebar, pointed.list).filter((group) => group.id !== pointed.groupId);
	const groupWithTab = async (): Promise<void> => {
		const made = await newGroup.run({ withTabId: pointed.id });

		if (made.ok) {
			onGroupMade(made.output.id);
		}
	};
	return (
		<ContextMenuGroup>
			<AddToEssentialsItem pointed={pointed} at={sidebar.essentials.length} />
			<PointerItem
				icon={isPinned ? "pin-off" : "pin"}
				label={isPinned ? "Unpin" : "Pin"}
				onSelect={() => void pinTab.run({ id: pointed.id, isPinned: !isPinned })}
			/>
			<PointerItem icon="folder-plus" label="New group with this tab" onSelect={() => void groupWithTab()} />
			<MoveToGroupMenu tabId={pointed.id} list={pointed.list} groups={groups} />
			<PointerItem icon="pencil" label="Rename" onSelect={() => onRename(pointed.id)} />
			<ContextMenuSeparator className={POINTER_LINE} />
			<PointerItem
				icon="x"
				label="Close"
				isDisabled={pointed.isChat}
				onSelect={() => void closeTab.run({ id: pointed.id })}
			/>
		</ContextMenuGroup>
	);
}
