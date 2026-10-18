import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { Icon, PopoverItem } from "@widgetarium/kit";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";
import { PinTabCommand } from "../../contract.js";

export interface TabMenuItemsProps {
	readonly tab: AppTab;
	readonly onPicked: () => void;
}

const PIN = "Pin tab";
const UNPIN = "Unpin tab";

export function TabMenuItems({ tab, onPicked }: TabMenuItemsProps): ReactElement {
	const pinTab = useCommand(PinTabCommand);
	return (
		<div data-host-tab-menu={tab.id}>
			<PopoverItem
				onClick={() => {
					onPicked();
					void pinTab.run({
						id: tab.id,
						isPinned: !tab.isPinned,
					});
				}}
				data-host-pin-tab={tab.isPinned ? "unpin" : "pin"}
			>
				<Icon name={tab.isPinned ? "pin-off" : "pin"} size={16} />
				{tab.isPinned ? UNPIN : PIN}
			</PopoverItem>
		</div>
	);
}
