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
import { TabIcons, TabStatus, isShownItem, tabOf } from "@sumi/tab-strip-plugin";
import type { StripItem, TabActs } from "@sumi/tab-strip-plugin";

export interface TabEntryProps {
	readonly item: StripItem;
	readonly acts: TabActs;
	readonly isSub: boolean;
	readonly isPlaceholder: boolean;
	readonly subPages?: SidebarTab["subPages"];
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
	subPages,
	isFolded = false,
	depth = 0,
	draggedId = null,
	onMenu,
}: TabEntryProps): ReactElement {
	const { id, title, mark } = tabOf(item);
	const Holder = isSub ? SidebarMenuSubItem : SidebarMenuItem;
	const isInFocus = isShownItem(item) || (subPages ?? []).some(({ tab }) => tab.isShown);
	const isOpen =
		subPages !== undefined && subPages.length > 0 && (!isFolded || subPages.some(({ tab }) => tab.id === draggedId));
	const inner: CSSProperties & Readonly<Record<"--side-depth", number>> = {
		"--side-depth": depth + 1,
	};
	return (
		<Holder role="presentation" data-sort-block={subPages === undefined ? undefined : id}>
			<SidebarMenuButton
				size="sm"
				role="tab"
				data-sort-id={id}
				data-sort-into={subPages !== undefined && !isOpen ? "" : undefined}
				data-sort-placeholder={isPlaceholder ? "" : undefined}
				data-tabs-page={subPages === undefined ? undefined : id}
				aria-selected={isShownItem(item)}
				isActive={isInFocus}
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
				<TabStatus mark={mark} />
			</SidebarMenuButton>
			<ListPluginSlot name="tabs-sidebar.tab-actions" props={{ tabId: id }} />
			<SidebarMenuAction showOnHover={!isInFocus} label={CLOSE_TAB} onClick={() => acts.close(item)}>
				<Icon name="x" size={CLOSE_PX} />
			</SidebarMenuAction>
			{isOpen ? (
				<SidebarMenuSub role="presentation" style={inner}>
					{subPages.map((subPage) => (
						<TabEntry
							key={subPage.tab.id}
							item={{ kind: "tab", tab: subPage.tab, list: item.list, groupId: null, group: null }}
							acts={acts}
							isSub
							isPlaceholder={isPlaceholder || subPage.tab.id === draggedId}
							onMenu={onMenu}
						/>
					))}
				</SidebarMenuSub>
			) : null}
		</Holder>
	);
}
