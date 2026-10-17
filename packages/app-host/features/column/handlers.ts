import { handler } from "@widgetarium/core/requests";
import { TabsColumnGateway } from "../../gateways/tabs-column/tabs-column.gateway.js";
import { columnDraggedTo, columnOf } from "../../shared/lib/tabs-column/column-look.js";
import { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import {
	MoveColumnCommand,
	ResizeColumnCommand,
	ShowColumnIconsCommand,
	TabsColumnQuery,
	ToggleColumnCommand,
} from "./contract.js";
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

export const ToggleColumnCommandHandler = handler(ToggleColumnCommand, AppHostClientModule)
	.inject(COLUMN)
	.handle((_input, parts) => {
		const kept = parts.tabsColumnStore.now();
		keepColumn(
			{
				...kept,
				isShown: !kept.isShown,
			},
			"toggle",
			parts,
		);
	});

export const ResizeColumnCommandHandler = handler(ResizeColumnCommand, AppHostClientModule)
	.inject(COLUMN)
	.handle(({ px }, parts) => keepColumn(columnDraggedTo(parts.tabsColumnStore.now(), px), `drag to ${px}px`, parts));

export const MoveColumnCommandHandler = handler(MoveColumnCommand, AppHostClientModule)
	.inject(COLUMN)
	.handle(({ side }, parts) =>
		keepColumn(
			{
				...parts.tabsColumnStore.now(),
				side,
			},
			`move to ${side}`,
			parts,
		),
	);

export const ShowColumnIconsCommandHandler = handler(ShowColumnIconsCommand, AppHostClientModule)
	.inject(COLUMN)
	.handle((_input, parts) =>
		keepColumn(
			{
				...parts.tabsColumnStore.now(),
				isShown: true,
				isFull: false,
			},
			"show icons",
			parts,
		),
	);

function keepColumn(next: KeptColumn, reason: string, { tabsColumnStore, tabsColumnGateway }: ColumnParts): void {
	tabsColumnStore.become(next, reason);
	tabsColumnGateway.keep(tabsColumnStore.now());
}
