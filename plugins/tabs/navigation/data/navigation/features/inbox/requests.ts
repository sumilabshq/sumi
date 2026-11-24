import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { flowsChanged } from "../../gateways/flows/flows.events.js";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { callKeyOf } from "../../shared/lib/flows/flow-ids.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import { InboxClearedSchema, InboxRowsSchema, UndoClearAskSchema } from "../../shared/schema/flow-asks.schema.js";
import { clearInboxPlan, inboxRowsOf, undoInboxClearPlan } from "./lib/inbox-plans.js";

export const rows = query()
	.public()
	.output(InboxRowsSchema)
	.handle(async (_input, { tabs, placedApps }) => {
		const { tabs: placed, flows } = await tabs.places();
		return { rows: flows === null ? [] : inboxRowsOf({ placed, doc: flows, apps: placedApps.placedApps() }) };
	});

export const clear = command()
	.public()
	.output(InboxClearedSchema)
	.idempotencyKey(PerCall)
	.handle(async (_input, { tabs, placedApps, idempotencyKey }) => {
		const moment = { clearId: callKeyOf(idempotencyKey), at: Date.now(), apps: placedApps.placedApps() };
		return answered(await tabs.movePlaces(flowsMove(clearInboxPlan(moment))));
	});

export const undoClear = command()
	.public()
	.input(UndoClearAskSchema)
	.output(InboxClearedSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ clearId }, { tabs }) => answered(await tabs.movePlaces(flowsMove(undoInboxClearPlan(clearId)))));

export const rereadInbox = subscriber(flowsChanged).handle((_input, { invalidate }) => {
	invalidate(rows);
});

export const rereadInboxMarks = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(rows);
});
