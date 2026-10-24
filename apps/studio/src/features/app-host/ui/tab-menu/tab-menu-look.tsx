import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { ContextMenuShortcut, Icon, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { PointerSpot } from "../../lib/pointer-spot/pointer-spot.js";
import type { TabMenuAction, TabMenuGroups } from "../../lib/use-tab-menu-groups.js";
import { PointerPopover } from "../pointer-popover/pointer-popover.js";

export interface TabMenuLookProps {
	readonly tabId: string;
	readonly spot: PointerSpot | null;
	readonly groups: TabMenuGroups;
	readonly onDismiss: () => void;
}

export function TabMenuLook({ tabId, spot, groups, onDismiss }: TabMenuLookProps): ReactElement {
	const itemOf = (action: TabMenuAction): ReactElement => (
		<PopoverItem
			key={action.key}
			disabled={action.isDisabled}
			onClick={() => {
				onDismiss();
				action.run();
			}}
			data-host-tab-action={action.key}
		>
			<Icon name={action.icon} size={16} />
			{action.label}
			{action.hint === null ? null : <ContextMenuShortcut>{action.hint}</ContextMenuShortcut>}
		</PopoverItem>
	);
	return (
		<PointerPopover spot={spot} onDismiss={onDismiss}>
			<div role="menu" data-host-tab-menu={tabId}>
				{groups.map((group, at) => (
					<Fragment key={group[0]?.key ?? at}>
						{at === 0 ? null : <PopoverSeparator />}
						{group.map(itemOf)}
					</Fragment>
				))}
			</div>
		</PointerPopover>
	);
}
