import { createElement as h, useLayoutEffect, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { appHost } from "@widgetarium/app-host/contract";
import type { SidebarGroupItem, SidebarGroupState, TabsSidebar } from "@widgetarium/app-host/contract";
import { closeGroupMenu, useAskedGroupMenu } from "../../lib/group-menu-ask.js";
import { SpotMenu } from "../spot-menu/spot-menu.js";
import type { MenuSpot } from "../spot-menu/spot-menu.js";

interface GroupMenuAt extends MenuSpot {
	readonly group: SidebarGroupState;
}

const MENU_LABEL = "Group";
const ANCHOR_GAP_PX = 4;
const MENU_CLASS = "sumi-group-menu";

export function GroupMenu(): ReactElement {
	const groupId = useAskedGroupMenu();
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const [at, setAt] = useState<GroupMenuAt | null>(null);

	useLayoutEffect(() => {
		const group = groupId === null ? null : groupOf(sidebar, groupId);

		if (group === null) {
			setAt(null);
			return;
		}

		setAt((shown) => (shown?.group.id === group.id ? { ...shown, group } : spotUnder(group)));
	}, [groupId, sidebar]);

	return (
		<SpotMenu at={at} className={MENU_CLASS} onClose={closeGroupMenu}>
			{(shown) => (
				<div role="menu" aria-label={MENU_LABEL}>
					<ListPluginSlot
						key={shown.group.id}
						name="tab-strip.group-menu-items"
						props={{ group: shown.group, onDone: closeGroupMenu }}
					/>
				</div>
			)}
		</SpotMenu>
	);
}

function groupOf(sidebar: TabsSidebar, groupId: string): SidebarGroupState | null {
	const tops = sidebar.sections.flatMap(({ entries }) => entries.flatMap((entry) => (entry.kind === "group" ? [entry] : [])));
	return groupAmong(tops, groupId);
}

function groupAmong(items: readonly SidebarGroupItem[], groupId: string): SidebarGroupState | null {
	for (const item of items) {
		if (item.kind !== "group") {
			continue;
		}

		const found = item.group.id === groupId ? item.group : groupAmong(item.group.items, groupId);

		if (found !== null) {
			return found;
		}
	}

	return null;
}

function spotUnder(group: SidebarGroupState): GroupMenuAt | null {
	const anchor = shownAnchorOf(group.id);

	if (anchor === null) {
		return null;
	}

	const box = anchor.getBoundingClientRect();
	const menuWidth = document.querySelector(`.wg-kit-pop.${MENU_CLASS}`)?.getBoundingClientRect().width ?? 0;
	return {
		group,
		x: box.left + Math.max(0, (box.width - menuWidth) / 2),
		y: box.bottom + ANCHOR_GAP_PX,
	};
}

function shownAnchorOf(groupId: string): HTMLElement | null {
	const anchors = [...document.querySelectorAll<HTMLElement>(`[data-group-anchor="${CSS.escape(groupId)}"]`)];
	return anchors.find((anchor) => anchor.getBoundingClientRect().width > 0) ?? null;
}
