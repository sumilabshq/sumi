import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { ContextMenuGroup } from "@widgetarium/kit";
import { CreateGroupCommand } from "@widgetarium/app-host";
import { useTogglesNewTabMenu } from "../../lib/use-toggles-new-tab-menu.js";
import { PointerItem } from "./pointer-item.js";
import type { Pointed, PointerMenuProps } from "./pointer-menu.js";

export function SpaceItems({
	pointed,
	onGroupMade,
}: PointerMenuProps & { readonly pointed: Extract<Pointed, { kind: "space" }> }): ReactElement {
	const openNewTabMenu = useTogglesNewTabMenu(pointed.list);
	const newGroup = useCommand(CreateGroupCommand);
	const makeGroup = async (): Promise<void> => {
		const made = await newGroup.run({ list: pointed.list });

		if (made.ok) {
			onGroupMade(made.output.id);
		}
	};
	return (
		<ContextMenuGroup>
			<PointerItem icon="plus" label="New tab" onSelect={openNewTabMenu} />
			<PointerItem icon="folder-plus" label="New group" onSelect={() => void makeGroup()} />
		</ContextMenuGroup>
	);
}
