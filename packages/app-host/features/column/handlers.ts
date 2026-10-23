import { handler } from "@widgetarium/core/requests";
import { TabsColumnGateway } from "../../gateways/tabs-column/tabs-column.gateway.js";
import { columnDraggedTo, columnOf } from "../../shared/lib/tabs-column/column-look.js";
import { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import { FoldTabListCommand, ResizeColumnCommand, TabsColumnQuery } from "./contract.js";
import { AppHostClientModule } from "../../module.js";

const COLUMN = {
	tabsColumnStore: TabsColumnStore,
	tabsColumnGateway: TabsColumnGateway,
};

interface ColumnParts {
	readonly tabsColumnStore: TabsColumnStore;
	readonly tabsColumnGateway: TabsColumnGateway;
}

export const TabsColumnQueryHandler = handler(TabsColumnQuery, AppHostClientModule)
	.inject({ tabsColumnStore: TabsColumnStore })
	.watch((_input, { tabsColumnStore }, changed) => tabsColumnStore.watch(changed))
	.handle((_input, { tabsColumnStore }) => columnOf(tabsColumnStore.now()));

export const ResizeColumnCommandHandler = handler(ResizeColumnCommand, AppHostClientModule)
	.inject(COLUMN)
	.handle(({ px }, parts) => keepColumn(columnDraggedTo(parts.tabsColumnStore.now(), px), `drag to ${px}px`, parts));

export const FoldTabListCommandHandler = handler(FoldTabListCommand, AppHostClientModule)
	.inject(COLUMN)
	.handle(({ list }, parts) => {
		const kept = parts.tabsColumnStore.now();
		const isShut = kept.shutLists.includes(list);
		keepColumn(
			{
				...kept,
				shutLists: isShut ? kept.shutLists.filter((one) => one !== list) : [...kept.shutLists, list],
			},
			isShut ? `unfold the tab list ${list}` : `fold the tab list ${list}`,
			parts,
		);
	});

function keepColumn(next: KeptColumn, reason: string, { tabsColumnStore, tabsColumnGateway }: ColumnParts): void {
	tabsColumnStore.become(next, reason);
	tabsColumnGateway.keep(tabsColumnStore.now());
}
