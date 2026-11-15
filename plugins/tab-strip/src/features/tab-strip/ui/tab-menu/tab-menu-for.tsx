import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { stripItemsOf } from "../../lib/strip-items.js";
import type { StripItem } from "../../lib/strip-items.js";
import { useTabActs } from "../../lib/use-tab-acts.js";
import { TabMenu } from "./tab-menu.js";

export interface TabMenuAsk {
	readonly id: string;
	readonly x: number;
	readonly y: number;
}

export interface TabMenuForProps {
	readonly ask: TabMenuAsk | null;
	onClose(): void;
}

export function TabMenuFor({ ask, onClose }: TabMenuForProps): ReactElement {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const items = stripItemsOf(sidebar);
	const acts = useTabActs({ items, newTabList: sidebar.newTabList, essentialsCount: sidebar.essentials.length });
	const item = ask === null ? undefined : items.find((one) => holdsId(one, ask.id));
	const at = ask === null || item === undefined ? null : { item, x: ask.x, y: ask.y };
	return <TabMenu at={at} acts={acts} hasOthers={items.length > 1} onClose={onClose} />;
}

function holdsId(item: StripItem, id: string): boolean {
	if (item.kind === "tab") {
		return item.tab.id === id;
	}

	return item.split.id === id || item.split.members.some((member) => member.item.tab.id === id);
}
