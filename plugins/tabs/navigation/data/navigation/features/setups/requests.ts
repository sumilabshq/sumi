import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { flowsChanged } from "../../gateways/flows/flows.events.js";
import { callKeyOf, newSetupIdOf, startedFlowIdOf } from "../../shared/lib/flows/flow-ids.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import {
	FlowStartedSchema,
	SaveSetupAskSchema,
	SetupIdAskSchema,
	SetupSavedSchema,
	SetupsSchema,
	StartSetupAskSchema,
} from "../../shared/schema/flow-asks.schema.js";
import { removeSetupPlan, saveSetupPlan, startSetupMove } from "./lib/setup-plans.js";

export const all = query()
	.public()
	.output(SetupsSchema)
	.handle(async (_input, { tabs }) => ({ setups: (await tabs.places()).flows?.setups ?? [] }));

export const saveFrom = command()
	.public()
	.input(SaveSetupAskSchema)
	.output(SetupSavedSchema)
	.idempotencyKey(PerCall)
	.handle(async (ask, { tabs, idempotencyKey }) => {
		const saved = answered(
			await tabs.movePlaces(flowsMove(saveSetupPlan(ask, newSetupIdOf(callKeyOf(idempotencyKey))))),
		);
		return { setupId: saved.setupId };
	});

export const start = command()
	.public()
	.input(StartSetupAskSchema)
	.output(FlowStartedSchema)
	.idempotencyKey(PerCall)
	.handle(async (ask, { tabs, placedApps, idempotencyKey }) => {
		const birth = { id: startedFlowIdOf(callKeyOf(idempotencyKey)), at: Date.now() };
		return answered(await tabs.movePlaces(startSetupMove(ask, birth, placedApps.placedApps())));
	});

export const remove = command()
	.public()
	.input(SetupIdAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ setupId }, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(removeSetupPlan(setupId))));
	});

export const rereadSetups = subscriber(flowsChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});
