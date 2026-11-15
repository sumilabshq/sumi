import { createElement as h, Fragment, useRef } from "react";
import type { ReactElement } from "react";
import { Icon, Popover, PopoverAnchor, PopoverContent, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { tabOf } from "../../lib/strip-items.js";
import type { StripItem } from "../../lib/strip-items.js";
import type { TabActs } from "../../lib/use-tab-acts.js";
import { SplitRows } from "../split-rows/split-rows.js";

export interface TabMenuAt {
	readonly item: StripItem;
	readonly x: number;
	readonly y: number;
}

export interface TabMenuProps {
	readonly at: TabMenuAt | null;
	readonly acts: TabActs;
	readonly hasOthers: boolean;
	readonly onClose: () => void;
}

const MENU_LABEL = "Tab";
const ITEM_ICON_PX = 16;

export function TabMenu({ at, acts, hasOthers, onClose }: TabMenuProps): ReactElement {
	const last = useRef(at);

	if (at !== null) {
		last.current = at;
	}

	const spot = last.current;
	const chose = (run: () => void) => () => {
		onClose();
		run();
	};
	return (
		<Popover
			open={at !== null}
			onOpenChange={(isOpen) => isOpen || onClose()}
			placement="over"
			isPortaled
			className="is-compact sumi-tab-menu"
		>
			{spot === null ? null : (
				<PopoverAnchor
					className="sumi-tab-menu-spot"
					style={{
						left: spot.x,
						top: spot.y,
					}}
					aria-hidden="true"
				/>
			)}
			<PopoverContent>
				{spot === null ? null : <TabMenuItems at={spot} acts={acts} hasOthers={hasOthers} chose={chose} onDone={onClose} />}
			</PopoverContent>
		</Popover>
	);
}

interface TabMenuItemsProps {
	readonly at: TabMenuAt;
	readonly acts: TabActs;
	readonly hasOthers: boolean;
	readonly chose: (run: () => void) => () => void;
	onDone(): void;
}

function TabMenuItems({ at: { item }, acts, hasOthers, chose, onDone }: TabMenuItemsProps): ReactElement {
	const tab = tabOf(item);
	return (
		<div role="menu" aria-label={MENU_LABEL} data-tab-menu={tab.id}>
			{item.kind === "split" ? (
				<>
					<SplitRows split={item.split} onDone={onDone} />
					<PopoverSeparator />
				</>
			) : null}
			<PopoverItem role="menuitem" onClick={chose(() => acts.togglePin(item))}>
				<Icon name={item.isPinned ? "pin-off" : "pin"} size={ITEM_ICON_PX} />
				{item.isPinned ? "Unpin" : "Pin"}
			</PopoverItem>
			<PopoverItem role="menuitem" onClick={chose(() => acts.duplicate(item))}>
				<Icon name="copy-plus" size={ITEM_ICON_PX} />
				Duplicate
			</PopoverItem>
			<PopoverItem role="menuitem" disabled={tab.address === null} onClick={chose(() => acts.copyLink(tab))}>
				<Icon name="link" size={ITEM_ICON_PX} />
				Copy link
			</PopoverItem>
			<PopoverItem role="menuitem" disabled={!tab.isTearable} onClick={chose(() => acts.tearOff(tab))}>
				<Icon name="app-window" size={ITEM_ICON_PX} />
				Move to a new window
			</PopoverItem>
			<PopoverSeparator />
			<PopoverItem role="menuitem" onClick={chose(() => acts.close(item))}>
				<Icon name="x" size={ITEM_ICON_PX} />
				Close
			</PopoverItem>
			<PopoverItem role="menuitem" disabled={!hasOthers} onClick={chose(() => acts.closeOthers(item))}>
				<Icon name="list-x" size={ITEM_ICON_PX} />
				Close other tabs
			</PopoverItem>
		</div>
	);
}
