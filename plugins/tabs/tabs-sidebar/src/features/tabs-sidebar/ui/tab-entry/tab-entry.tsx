import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSubItem } from "@widgetarium/kit";
import { TabIcons, isShownItem, tabOf } from "@sumi/tab-strip-plugin";
import type { StripItem, TabActs } from "@sumi/tab-strip-plugin";

export interface TabEntryProps {
	readonly item: StripItem;
	readonly acts: TabActs;
	readonly isSub: boolean;
	readonly isPlaceholder: boolean;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

const MIDDLE_BUTTON = 1;
const CLOSE_PX = 14;
const CLOSE_TAB = "Close tab";

export function TabEntry({ item, acts, isSub, isPlaceholder, onMenu }: TabEntryProps): ReactElement {
	const { id, title } = tabOf(item);
	const Holder = isSub ? SidebarMenuSubItem : SidebarMenuItem;
	return (
		<Holder role="presentation">
			<SidebarMenuButton
				size="sm"
				role="tab"
				data-sort-id={id}
				data-sort-placeholder={isPlaceholder ? "" : undefined}
				aria-selected={isShownItem(item)}
				isActive={isShownItem(item)}
				onClick={() => acts.show(item)}
				onAuxClick={(event) => {
					if (event.button === MIDDLE_BUTTON) {
						acts.close(item);
					}
				}}
				onContextMenu={(event) => {
					event.preventDefault();
					onMenu(id, event);
				}}
			>
				<TabIcons item={item} />
				<span className="sumi-tabs-sidebar-title">{title}</span>
			</SidebarMenuButton>
			<SidebarMenuAction showOnHover label={CLOSE_TAB} onClick={() => acts.close(item)}>
				<Icon name="x" size={CLOSE_PX} />
			</SidebarMenuAction>
		</Holder>
	);
}
