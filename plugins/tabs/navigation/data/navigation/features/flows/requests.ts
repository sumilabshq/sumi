import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { flowsChanged } from "../../gateways/flows/flows.events.js";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { callKeyOf, newFlowIdOf } from "../../shared/lib/flows/flow-ids.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import {
	AdoptChatsAskSchema,
	ArchivedFlowsSchema,
	AdoptedChatsSchema,
	CreateFlowAskSchema,
	DuplicateFlowAskSchema,
	FlowDuplicatedSchema,
	FlowAskSchema,
	FlowDetailSchema,
	FlowStartedSchema,
	FlowsSidebarSchema,
	MoveFlowAskSchema,
	OpenFlowAskSchema,
	OpenFlowTabAskSchema,
	RemoveFlowAskSchema,
	RenameAskSchema,
	SetIconAskSchema,
	WindowFlowAskSchema,
} from "../../shared/schema/flow-asks.schema.js";
import { OpenedTabSettledSchema, TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { adoptChatsMove } from "./lib/adopt-plans.js";
import { deleteFlowMove } from "./lib/flow-delete-plans.js";
import { duplicateFlowMove } from "./lib/flow-duplicate-plans.js";
import { openFlowMove } from "./lib/flow-open-plans.js";
import { openFlowTabMove } from "./lib/flow-tab-plans.js";
import { createFlowPlan, moveFlowPlan, removeFlowMove, renameFlowPlan, setFlowIconPlan } from "./lib/flow-plans.js";
import { archiveFlowPlan, unarchiveFlowPlan } from "./lib/flow-archive-plans.js";
import { archivedOf, flowDetailOf, sidebarOf } from "./lib/flow-reads.js";

export const sidebar = query()
	.public()
	.input(WindowFlowAskSchema)
	.output(FlowsSidebarSchema)
	.handle(async ({ window }, { tabs, placedApps }) => sidebarOf(await tabs.places(), placedApps.placedApps(), window));

export const archived = query()
	.public()
	.output(ArchivedFlowsSchema)
	.handle(async (_input, { tabs }) => archivedOf(await tabs.places()));

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

export const duplicate = command()
	.public()
	.input(DuplicateFlowAskSchema)
	.output(FlowDuplicatedSchema)
	.idempotencyKey(PerCall)
	.handle(async (ask, { tabs, placedApps, idempotencyKey }) => {
		const birth = { id: newFlowIdOf(callKeyOf(idempotencyKey)), at: Date.now() };
		const { extra, effects } = answered(await tabs.movePlaces(duplicateFlowMove(ask, placedApps.placedApps(), birth)));
		return { flowId: extra, effects };
	});

export const open = command()
	.public()
	.input(OpenFlowAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(openFlowMove(ask, placedApps.placedApps()))),
	);

export const openTab = command()
	.public()
	.input(OpenFlowTabAskSchema)
	.output(OpenedTabSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) => {
		const { effects, extra } = answered(await tabs.movePlaces(openFlowTabMove(ask, placedApps.placedApps())));
		return { id: extra, effects };
	});

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

export const archive = command()
	.public()
	.input(FlowAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(archiveFlowPlan(ask, Date.now()))));
	});

export const unarchive = command()
	.public()
	.input(FlowAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(unarchiveFlowPlan(ask))));
	});

export const deleteFlow = command()
	.public()
	.input(RemoveFlowAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs, placedApps }) =>
		answered(await tabs.movePlaces(deleteFlowMove(ask, placedApps.placedApps()))),
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
	invalidate(archived);
	invalidate(one);
});

export const rereadFlowMarks = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(sidebar);
	invalidate(one);
});
