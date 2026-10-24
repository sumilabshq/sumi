import { z } from "zod";
import { Repeatable, command, query, subscriber } from "@widgetarium/core/requests";
import { TabsColumnChangedEvent } from "../../gateways/tabs-column/tabs-column.events.js";
import { TabsColumnGateway } from "../../gateways/tabs-column/tabs-column.gateway.js";
import {
	columnDraggedTo,
	columnOf,
	columnReset,
	columnSaid,
	columnWithListFolded,
} from "../../shared/lib/tabs-column/column-look.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import { TabsColumnSchema } from "../../shared/schema/tabs-column.schema.js";

interface ColumnMove {
	readonly was: KeptColumn;
	readonly next: KeptColumn;
	readonly reason: string;
}

export const TabsColumnQuery = query("tabs-column")
	.output(TabsColumnSchema)
	.settlesNow()
	.inject({ tabsColumn: TabsColumnGateway })
	.handle((_input, { tabsColumn }) => columnOf(tabsColumn.column()));

export const ResizeColumnCommand = command("resize-column")
	.input(z.object({ px: z.number() }))
	.idempotencyKey(Repeatable)
	.inject({ tabsColumn: TabsColumnGateway })
	.handle(({ px }, { tabsColumn }) => {
		const kept = tabsColumn.column();
		saveColumn(tabsColumn, { was: kept, next: columnDraggedTo(kept, px), reason: `drag to ${px}px` });
	});

export const ResetColumnCommand = command("reset-column")
	.idempotencyKey(Repeatable)
	.inject({ tabsColumn: TabsColumnGateway })
	.handle((_input, { tabsColumn }) => {
		const kept = tabsColumn.column();
		saveColumn(tabsColumn, { was: kept, next: columnReset(kept), reason: "reset" });
	});

export const FoldTabListCommand = command("fold-tab-list")
	.input(z.object({ list: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ tabsColumn: TabsColumnGateway })
	.handle(({ list }, { tabsColumn }) => {
		const kept = tabsColumn.column();
		saveColumn(tabsColumn, {
			was: kept,
			next: columnWithListFolded(kept, list),
			reason: `fold or unfold the tab list ${list}`,
		});
	});

export const RereadTabsColumnSubscriber = subscriber(TabsColumnChangedEvent).handle((_input, { invalidate }) => {
	invalidate(TabsColumnQuery);
});

function saveColumn(tabsColumn: TabsColumnGateway, { was, next, reason }: ColumnMove): void {
	if (columnSaid(was) === columnSaid(next)) {
		return;
	}

	tabsColumn.saveColumn(next, reason);
	console.info(`[widgetarium] tabs column ${columnSaid(was)} → ${columnSaid(next)} (${reason})`);
}
