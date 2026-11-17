import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { groups } from "@sumi/groups/contract";
import { editCreatedGroup } from "../../lib/edit-created-group.js";
import { holdingGroupOf } from "../../lib/holding-group.js";
import { warnIfRefused } from "../../lib/warn-if-refused.js";

export interface GroupMenuItemsProps {
	readonly tab: AppTabState;
	readonly onDone: () => void;
}

const ITEM_ICON_PX = 16;

export function GroupMenuItems({ tab, onDone }: GroupMenuItemsProps): ReactElement {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const create = useCommand(groups.actions.create);
	const placeTab = useCommand(appHost.tabs.placeTab);
	const holding = holdingGroupOf(sidebar, tab.id);
	return (
		<>
			<PopoverItem
				role="menuitem"
				onClick={() => {
					onDone();
					void create.run({ withTabId: tab.id }).then(editCreatedGroup(`new group with ${tab.id}`));
				}}
			>
				<Icon name="folder-plus" size={ITEM_ICON_PX} />
				Add to new group
			</PopoverItem>
			{holding === null ? null : (
				<PopoverItem
					role="menuitem"
					onClick={() => {
						onDone();
						void placeTab
							.run({
								id: tab.id,
								to: {
									kind: "list",
									list: holding.list,
									groupId: null,
									before: holding.groupId,
								},
							})
							.then(warnIfRefused(`taking ${tab.id} out of ${holding.groupId}`));
					}}
				>
					<Icon name="folder-minus" size={ITEM_ICON_PX} />
					Remove from group
				</PopoverItem>
			)}
		</>
	);
}
