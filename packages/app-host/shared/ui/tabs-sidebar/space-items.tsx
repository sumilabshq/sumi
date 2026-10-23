import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ContextMenuGroup } from "@widgetarium/kit";
import { CreateGroupCommand } from "../../../features/groups/contract.js";
import { OpenTabCommand } from "../../../features/tabs/contract.js";
import { PointerItem } from "./pointer-item.js";
import type { PointerMenuProps } from "./pointer-menu.js";

export function SpaceItems({ onGroupMade }: PointerMenuProps): ReactElement {
	const openTab = useCommand(OpenTabCommand);
	const newGroup = useCommand(CreateGroupCommand);
	const makeGroup = async (): Promise<void> => {
		const made = await newGroup.run({ withTabId: null });

		if (made.ok) {
			onGroupMade(made.output.id);
		}
	};
	return (
		<ContextMenuGroup>
			<PointerItem icon="plus" label="New tab" onSelect={() => void openTab.run({ app: "browser" })} />
			<PointerItem icon="folder-plus" label="New group" onSelect={() => void makeGroup()} />
		</ContextMenuGroup>
	);
}
