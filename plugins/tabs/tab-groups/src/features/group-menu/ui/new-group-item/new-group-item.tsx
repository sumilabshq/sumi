import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { groups } from "@sumi/groups/contract";
import { editCreatedGroup } from "../../lib/edit-created-group.js";

export interface NewGroupItemProps {
	readonly list: string;
	readonly onDone: () => void;
}

const ITEM_ICON_PX = 16;

export function NewGroupItem({ list, onDone }: NewGroupItemProps): ReactElement {
	const create = useCommand(groups.actions.create);
	return (
		<PopoverItem
			role="menuitem"
			onClick={() => {
				onDone();
				void create.run({ list }).then(editCreatedGroup(`new group in ${list}`));
			}}
		>
			<Icon name="folder-plus" size={ITEM_ICON_PX} />
			New group
		</PopoverItem>
	);
}
