import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import { Icon, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { SpotMenu } from "../spot-menu/spot-menu.js";
import type { MenuSpot } from "../spot-menu/spot-menu.js";

export interface TabMenuAt extends MenuSpot {
	readonly tabId: string;
}

export interface TabMenuActs {
	readonly rename: (tabId: string) => void;
	readonly duplicate: (tabId: string) => void;
	readonly splitRight: (tabId: string) => void;
	readonly splitDown: (tabId: string) => void;
	readonly saveAsSetup: (name: string) => void;
	readonly close: (tabId: string) => void;
}

export interface PaneTabMenuProps {
	readonly at: TabMenuAt | null;
	readonly flowId: string;
	readonly acts: TabMenuActs;
	readonly onClose: () => void;
}

const MENU_LABEL = "Tab";
const FALLBACK_SETUP_NAME = "Setup";

export function PaneTabMenu({ at, flowId, acts, onClose }: PaneTabMenuProps): ReactElement {
	return (
		<SpotMenu at={at} onClose={onClose}>
			{(shown) => <PaneTabMenuItems tabId={shown.tabId} flowId={flowId} acts={acts} onClose={onClose} />}
		</SpotMenu>
	);
}

interface ItemsProps {
	readonly tabId: string;
	readonly flowId: string;
	readonly acts: TabMenuActs;
	readonly onClose: () => void;
}

function PaneTabMenuItems({ tabId, flowId, acts, onClose }: ItemsProps): ReactElement {
	const flowName = useOptionalQuery(navigation.flows.one, { flowId }).data?.flow.name.trim();
	const chose = (run: () => void) => () => {
		onClose();
		run();
	};
	return (
		<div role="menu" aria-label={MENU_LABEL}>
			<PopoverItem role="menuitem" icon={<Icon name="pencil-line" />} onClick={chose(() => acts.rename(tabId))}>
				Rename
			</PopoverItem>
			<PopoverItem role="menuitem" icon={<Icon name="copy-plus" />} onClick={chose(() => acts.duplicate(tabId))}>
				Duplicate
			</PopoverItem>
			<PopoverItem role="menuitem" icon={<Icon name="columns-2" />} onClick={chose(() => acts.splitRight(tabId))}>
				Split right
			</PopoverItem>
			<PopoverItem
				role="menuitem"
				icon={<Icon name="square-split-vertical" />}
				onClick={chose(() => acts.splitDown(tabId))}
			>
				Split down
			</PopoverItem>
			<PopoverSeparator />
			<PopoverItem
				role="menuitem"
				icon={<Icon name="bookmark" />}
				onClick={chose(() => acts.saveAsSetup(flowName === undefined || flowName === "" ? FALLBACK_SETUP_NAME : flowName))}
			>
				Save as setup
			</PopoverItem>
			<PopoverSeparator />
			<PopoverItem role="menuitem" icon={<Icon name="x" />} onClick={chose(() => acts.close(tabId))}>
				Close
			</PopoverItem>
		</div>
	);
}
