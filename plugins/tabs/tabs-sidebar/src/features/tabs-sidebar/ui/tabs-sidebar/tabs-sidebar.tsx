import { createElement as h, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { Icon, Sidebar, SidebarContent, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@widgetarium/kit";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { DragLayer, ListMenu, TabMenuFor, stripItemsOf, useNewTabs, useTabActs } from "@sumi/tab-strip-plugin";
import type { ListMenuAt, TabMenuAsk } from "@sumi/tab-strip-plugin";
import { useSidebarDragOut } from "../../lib/use-sidebar-drag-out.js";
import { useSidebarWidth } from "../../lib/use-sidebar-width.js";
import { SidebarSection } from "../sidebar-section/sidebar-section.js";

const TABS = "Tabs";
const NEW_TAB = "New tab";
const ICON_PX = 16;

export function TabsSidebar(): ReactNode {
	const look = useQuery(appHost.frameSides.frameSides).data.left;
	return look === "docked" ? <SidebarColumn /> : null;
}

function SidebarColumn(): ReactNode {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const items = stripItemsOf(sidebar);
	const acts = useTabActs({
		items,
		newTabList: sidebar.newTabList,
	});
	const newTabs = useNewTabs();
	const width = useSidebarWidth();
	const [menu, setMenu] = useState<TabMenuAsk | null>(null);
	const [listMenu, setListMenu] = useState<ListMenuAt | null>(null);
	const column = useRef<HTMLDivElement | null>(null);
	const dragOut = useSidebarDragOut(column, items, acts);
	const newTabRow = (
		<SidebarMenuItem role="presentation" className="sumi-tabs-sidebar-new-row">
			<SidebarMenuButton size="sm" className="sumi-tabs-sidebar-new" onClick={newTabs.open}>
				<Icon name="plus" size={ICON_PX} />
				<span className="sumi-tabs-sidebar-title">{NEW_TAB}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
	return (
		<div
			ref={column}
			className="wg-root sumi-tabs-sidebar-column"
			onContextMenu={(event) => {
				if (event.defaultPrevented) {
					return;
				}

				event.preventDefault();
				setListMenu({
					list: sidebar.newTabList,
					x: event.clientX,
					y: event.clientY,
				});
			}}
		>
			<Sidebar
				as="aside"
				side="left"
				variant="sidebar"
				collapsible="none"
				className="sumi-tabs-sidebar"
				style={{ width: width.px }}
				aria-label={TABS}
			>
				<SidebarContent>
					<ListPluginSlot name="tabs-sidebar.sections-start" props={{}} />
					{sidebar.sections.map((section, index) => (
						<SidebarSection
							key={section.list}
							list={section.list}
							sidebar={sidebar}
							acts={acts}
							last={index === sidebar.sections.length - 1 ? newTabRow : null}
							onSorting={dragOut.onSorting}
							onDropOutside={dragOut.onDropOutside}
							onMenu={(id, event) =>
								setMenu({
									id,
									x: event.clientX,
									y: event.clientY,
								})
							}
						/>
					))}
				</SidebarContent>
				<ListPluginSlot name="tabs-sidebar.foot" props={{}} />
				<TabMenuFor ask={menu} onClose={() => setMenu(null)} />
				<ListMenu at={listMenu} onClose={() => setListMenu(null)} />
			</Sidebar>
			{dragOut.lifted === null ? null : <DragLayer lifted={dragOut.lifted} />}
			<SidebarRail widthPx={width.px} onWidth={width.onWidth} onWidthDone={width.onWidthDone} />
		</div>
	);
}
