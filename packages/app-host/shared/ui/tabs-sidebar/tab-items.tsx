import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ContextMenuGroup, ContextMenuSeparator } from "@widgetarium/kit";
import { CreateGroupCommand } from "../../../features/groups/contract.js";
import { CloseTabCommand, PlaceTabCommand } from "../../../features/tabs/contract.js";
import { POINTER_LINE } from "../../lib/menu-look/menu-look.js";
import { MoveToGroupMenu } from "./move-to-group-menu.js";
import { MoveToSectionMenu } from "./move-to-section-menu.js";
import { PointerItem } from "./pointer-item.js";
import type { Pointed, PointerMenuProps } from "./pointer-menu.js";

export function TabItems({
	pointed,
	sections,
	listTargets,
	essentials,
	onRename,
	onGroupMade,
}: PointerMenuProps & { readonly pointed: Extract<Pointed, { kind: "tab" }> }): ReactElement {
	const placeTab = useCommand(PlaceTabCommand);
	const newGroup = useCommand(CreateGroupCommand);
	const closeTab = useCommand(CloseTabCommand);
	const section = sections.find((one) => one.list === pointed.list);
	const groups = (section?.entries ?? []).flatMap((entry) =>
		entry.kind === "group" && entry.group.id !== pointed.groupId ? [entry.group] : [],
	);
	const groupWithTab = async (): Promise<void> => {
		const made = await newGroup.run({ withTabId: pointed.id });

		if (made.ok) {
			onGroupMade(made.output.id);
		}
	};
	return (
		<ContextMenuGroup>
			<PointerItem
				icon="grid-plus"
				label="Add to Essentials"
				onSelect={() =>
					void placeTab.run({
						id: pointed.id,
						to: {
							kind: "essentials",
							at: essentials.length,
						},
					})
				}
			/>
			<MoveToSectionMenu tabId={pointed.id} list={pointed.list} targets={listTargets} />
			<PointerItem icon="folder-plus" label="New group with this tab" onSelect={() => void groupWithTab()} />
			<MoveToGroupMenu tabId={pointed.id} list={pointed.list} groups={groups} />
			<PointerItem icon="pencil" label="Rename" onSelect={() => onRename(pointed.id)} />
			<ContextMenuSeparator className={POINTER_LINE} />
			<PointerItem icon="x" label="Close" onSelect={() => void closeTab.run({ id: pointed.id })} />
		</ContextMenuGroup>
	);
}
