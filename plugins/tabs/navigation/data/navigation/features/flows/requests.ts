import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { flowsChanged } from "../../gateways/flows/flows.events.js";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { callKeyOf, newFlowIdOf } from "../../shared/lib/flows/flow-ids.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import {
	AdoptChatsAskSchema,
	AdoptedChatsSchema,
	CreateFlowAskSchema,
	FlowAskSchema,
	FlowDetailSchema,
	FlowStartedSchema,
	FlowsSidebarSchema,
	MoveFlowAskSchema,
	OpenFlowAskSchema,
	RemoveFlowAskSchema,
	RenameAskSchema,
	SetIconAskSchema,
	WindowFlowAskSchema,
} from "../../shared/schema/flow-asks.schema.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { adoptChatsMove } from "./lib/adopt-plans.js";
import { openFlowMove } from "./lib/flow-open-plans.js";
import {
	createFlowPlan,
	moveFlowPlan,
	removeFlowMove,
	renameFlowPlan,
	setFlowIconPlan,
} from "./lib/flow-plans.js";
import { flowDetailOf, sidebarOf } from "./lib/flow-reads.js";

export const sidebar = query()
	.public()
	.input(WindowFlowAskSchema)
	.output(FlowsSidebarSchema)
	.handle(async ({ window }, { tabs, placedApps }) => sidebarOf(await tabs.places(), placedApps.placedApps(), window));

export const one = query()
	.public()
	.input(FlowAskSchema)
	.output(FlowDetailSchema.nullable())
	.handle(async ({ flowId }, { tabs, placedApps }) =>
		flowDetailOf(await tabs.places(), placedApps.placedApps(), flowId),
	);

export const create = command()
	.public()
	.input(CreateFlowAskSchema)
	.output(FlowStartedSchema)
	.idempotencyKey(PerCall)
	.handle(async (ask, { tabs, idempotencyKey }) => {
		const birth = { id: newFlowIdOf(callKeyOf(idempotencyKey)), at: Date.now() };
		const made = answered(await tabs.movePlaces(flowsMove(createFlowPlan(ask, birth))));
		return { flowId: made.flowId };
	});

export const open = command()
	.public()
	.input(OpenFlowAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(openFlowMove(ask, placedApps.placedApps()))),
	);

export const rename = command()
	.public()
	.input(RenameAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(renameFlowPlan(ask))));
	});

export const setIcon = command()
	.public()
	.input(SetIconAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(setFlowIconPlan(ask))));
	});

export const move = command()
	.public()
	.input(MoveFlowAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(moveFlowPlan(ask))));
	});

export const remove = command()
	.public()
	.input(RemoveFlowAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(removeFlowMove(ask, placedApps.placedApps()))),
	);

export const adoptChats = command()
	.public()
	.input(AdoptChatsAskSchema)
	.output(AdoptedChatsSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ chatIds }, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(adoptChatsMove(chatIds, placedApps.placedApps()))),
	);

export const rereadFlows = subscriber(flowsChanged).handle((_input, { invalidate }) => {
	invalidate(sidebar);
	invalidate(one);
});

export const rereadFlowMarks = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(sidebar);
	invalidate(one);
});
