import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { Icon, Popover } from "@widgetarium/kit";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";
import { TabMenuItems } from "../tab-menu/tab-menu-items.js";

export interface TabRowMenuProps {
	readonly tab: AppTab;
	readonly className: string;
	readonly isOpen: boolean;
	readonly onOpenChange: (isOpen: boolean) => void;
}

const TAB_MENU = "Tab menu";

export function TabRowMenu({ tab, className, isOpen, onOpenChange }: TabRowMenuProps): ReactElement {
	const trigger = (
		<Tip label={TAB_MENU}>
			<button type="button" className={className} aria-label={TAB_MENU} data-host-tab-more={tab.id}>
				<Icon name="ellipsis" size={16} />
			</button>
		</Tip>
	);
	return (
		<Popover open={isOpen} onOpenChange={onOpenChange} placement="below" isPortaled trigger={trigger}>
			<TabMenuItems tab={tab} onPicked={() => onOpenChange(false)} />
		</Popover>
	);
}
