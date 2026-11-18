import { createElement as h } from "react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import {
	Icon,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	cn,
} from "@widgetarium/kit";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import type { SidebarTab } from "@widgetarium/app-host/contract";
import { TabIcons, isShownItem, tabOf } from "@sumi/tab-strip-plugin";
import type { StripItem, TabActs } from "@sumi/tab-strip-plugin";

export interface TabEntryProps {
	readonly item: StripItem;
	readonly acts: TabActs;
	readonly isSub: boolean;
	readonly isPlaceholder: boolean;
	readonly artifacts?: SidebarTab["artifacts"];
	readonly isFolded?: boolean | undefined;
	readonly depth?: number;
	readonly draggedId?: string | null;
	onMenu(id: string, event: MouseEvent<HTMLElement>): void;
}

const MIDDLE_BUTTON = 1;
const CLOSE_PX = 14;
const CLOSE_TAB = "Close tab";

export function TabEntry({
	item,
	acts,
	isSub,
	isPlaceholder,
	artifacts,
	isFolded = false,
	depth = 0,
	draggedId = null,
	onMenu,
}: TabEntryProps): ReactElement {
	const { id, title, mark } = tabOf(item);
	const Holder = isSub ? SidebarMenuSubItem : SidebarMenuItem;
	const isOpen =
		artifacts !== undefined && artifacts.length > 0 && (!isFolded || artifacts.some(({ tab }) => tab.id === draggedId));
	const inner: CSSProperties & Readonly<Record<"--sumi-tabs-depth", number>> = {
		"--sumi-tabs-depth": depth + 1,
	};
	return (
		<Holder role="presentation" data-sort-block={artifacts === undefined ? undefined : id}>
			<SidebarMenuButton
				size="sm"
				role="tab"
				data-sort-id={id}
				data-sort-into={artifacts !== undefined && !isOpen ? "" : undefined}
				data-sort-placeholder={isPlaceholder ? "" : undefined}
				data-tabs-chat={artifacts === undefined ? undefined : id}
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
				<span className={cn("sumi-tabs-sidebar-title", mark === "running" && "wg-kit-shimmer")}>{title}</span>
			</SidebarMenuButton>
			<ListPluginSlot name="tabs-sidebar.tab-actions" props={{ tabId: id }} />
			<SidebarMenuAction showOnHover label={CLOSE_TAB} onClick={() => acts.close(item)}>
				<Icon name="x" size={CLOSE_PX} />
			</SidebarMenuAction>
			{isOpen ? (
				<SidebarMenuSub role="presentation" style={inner}>
					{artifacts.map((artifact) => (
						<TabEntry
							key={artifact.tab.id}
							item={{ kind: "tab", tab: artifact.tab, list: item.list, groupId: null, group: null }}
							acts={acts}
							isSub
							isPlaceholder={isPlaceholder || artifact.tab.id === draggedId}
							onMenu={onMenu}
						/>
					))}
				</SidebarMenuSub>
			) : null}
		</Holder>
	);
}
