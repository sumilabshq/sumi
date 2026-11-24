import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { flowsChanged } from "../../gateways/flows/flows.events.js";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import {
	layoutWithFocus,
	layoutWithPaneClosed,
	layoutWithShare,
	layoutWithSplit,
	layoutWithTabMoved,
	layoutWithTabShown,
} from "../../shared/lib/flows/flow-pane-edits.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import {
	FlowAskSchema,
	FlowBoardSchema,
	FlowPaneAskSchema,
	MoveFlowTabAskSchema,
	ResizeFlowPaneAskSchema,
	ShowFlowTabAskSchema,
	SplitFlowPaneAskSchema,
} from "../../shared/schema/flow-asks.schema.js";
import { flowBoardOf } from "./lib/pane-reads.js";
import { paneEditPlan } from "./lib/pane-plans.js";

export const board = query()
	.public()
	.input(FlowAskSchema)
	.output(FlowBoardSchema.nullable())
	.handle(async ({ flowId }, { tabs, placedApps }) =>
		flowBoardOf(await tabs.places(), placedApps.placedApps(), flowId),
	);

export const split = command()
	.public()
	.input(SplitFlowPaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		const edit = paneEditPlan(ask, `split ${ask.paneId} ${ask.side} with ${ask.tabId}`, (layout) =>
			layoutWithSplit(layout, ask),
		);
		answered(await tabs.movePlaces(flowsMove(edit)));
	});

export const closePane = command()
	.public()
	.input(FlowPaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		const edit = paneEditPlan(ask, `close ${ask.paneId}, its tabs join the neighbour`, (layout) =>
			layoutWithPaneClosed(layout, ask.paneId),
		);
		answered(await tabs.movePlaces(flowsMove(edit)));
	});

export const resize = command()
	.public()
	.input(ResizeFlowPaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		const edit = paneEditPlan(ask, `resize ${ask.splitId} at ${ask.at} to ${ask.share}`, (layout) =>
			layoutWithShare(layout, ask),
		);
		answered(await tabs.movePlaces(flowsMove(edit)));
	});

export const focus = command()
	.public()
	.input(FlowPaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		const edit = paneEditPlan(ask, `focus ${ask.paneId}`, (layout) => layoutWithFocus(layout, ask.paneId));
		answered(await tabs.movePlaces(flowsMove(edit)));
	});

export const showTab = command()
	.public()
	.input(ShowFlowTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		const edit = paneEditPlan(ask, `show ${ask.tabId}`, (layout) => layoutWithTabShown(layout, ask.tabId));
		answered(await tabs.movePlaces(flowsMove(edit)));
	});

export const moveTab = command()
	.public()
	.input(MoveFlowTabAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		const edit = paneEditPlan(ask, `move ${ask.tabId} to ${ask.paneId} before ${ask.before ?? "the end"}`, (layout) =>
			layoutWithTabMoved(layout, ask),
		);
		answered(await tabs.movePlaces(flowsMove(edit)));
	});

export const rereadBoardOnFlows = subscriber(flowsChanged).handle((_input, { invalidate }) => {
	invalidate(board);
});

export const rereadBoardOnTabs = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(board);
});
