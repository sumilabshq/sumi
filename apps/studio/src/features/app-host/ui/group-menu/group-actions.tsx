import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/framework";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { BOARD_ITEM } from "../../lib/menu-look/menu-look.js";
import { CloseGroupCommand, UngroupCommand } from "@widgetarium/app-host";
import type { GroupFace } from "../../lib/tabs-sidebar/sidebar-groups.js";

const UNGROUP = "Ungroup";

export function GroupActions({
	group,
	onClose,
}: {
	readonly group: GroupFace;
	readonly onClose: () => void;
}): ReactElement {
	const ungroup = useCommand(UngroupCommand);
	const closeGroup = useCommand(CloseGroupCommand);
	const ask = (run: () => void) => () => {
		onClose();
		run();
	};
	return (
		<div className="cv:flex cv:flex-col">
			<PopoverItem
				className={BOARD_ITEM}
				onClick={ask(() => void ungroup.run({ id: group.id }))}
				data-tabs-group-action="ungroup"
			>
				<Icon name="ungroup" size={15} />
				{UNGROUP}
			</PopoverItem>
			<PopoverItem
				className={BOARD_ITEM}
				onClick={ask(() => void closeGroup.run({ id: group.id }))}
				data-tabs-group-action="close"
			>
				<Icon name="x" size={15} />
				{closeSaid(group.count)}
			</PopoverItem>
		</div>
	);
}

function closeSaid(count: number): string {
	if (count === 0) {
		return "Remove group";
	}

	return count === 1 ? "Close 1 tab" : `Close ${count} tabs`;
}
