import { flowOfId, withFlowAdded } from "../../../shared/lib/flows/flow-docs.js";
import { layoutWithFreshIds, layoutWithTabsRenamed, placeAfterFlow } from "../../../shared/lib/flows/flow-copies.js";
import { tabsMoveAsPlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { MovePlaces, PlacedPlaces, PlacesMove } from "../../../shared/lib/flows/flow-moves.js";
import { flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import { flowHolderOf } from "../../../shared/lib/flows/flow-rows.js";
import { isRefusal, plannedWith, settlingWith } from "../../../shared/lib/settling/settling.js";
import type { Answer, ExtraPlan, Settled } from "../../../shared/lib/settling/settling.js";
import { duplicatePlan } from "../../../shared/lib/showing/opening-plans.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { DuplicateFlowAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { Flow, FlowsDoc } from "../../../shared/schema/flows.schema.js";
import type { z } from "zod";
import type { FlowBirth } from "./flow-plans.js";

type DuplicateFlowAsk = z.infer<typeof DuplicateFlowAskSchema>;
type FlowDuplicated = Answer<Settled<string>>;
type CopyOfTab = ReadonlyMap<string, string>;

const COPY_SUFFIX = " copy";
const NO_FLOW = 'no flow "{id}" stands here';
const HELD_ELSEWHERE = 'the flow "{id}" is open in window {window}: only that window duplicates it';
const NO_EFFECTS: Settled<string>["effects"] = [];

export function duplicateFlowMove(
	ask: DuplicateFlowAsk,
	apps: PlacedApps,
	birth: FlowBirth,
): MovePlaces<FlowDuplicated> {
	const tabsCopying = (ids: readonly string[]): MovePlaces<Answer<Settled<CopyOfTab>>> =>
		tabsMoveAsPlaces(settlingWith(ask.at, apps, tabCopiesPlan(ids)));
	return (now) => {
		const flow = now.flows === null ? undefined : flowOfId(now.flows, ask.flowId);

		if (now.flows === null || flow === undefined) {
			return refused(NO_FLOW.replace("{id}", ask.flowId));
		}

		const holder = flowHolderOf(now.tabs, now.flows, { flowId: ask.flowId, window: ask.at.window });

		if (holder !== null) {
			return refused(HELD_ELSEWHERE.replace("{id}", ask.flowId).replace("{window}", holder));
		}

		const ids = flowTabIdsOf(flow);
		const copied = ids.length === 0 ? null : tabsCopying(ids)(now);

		if (copied?.answer.isRefused === true) {
			return refused(copied.answer.reason);
		}

		return withCopyAdded({ now, flow, birth }, copied);
	};
}

function tabCopiesPlan(ids: readonly string[]): ExtraPlan<CopyOfTab> {
	return (showing, facts) => {
		const copyOfTab = new Map<string, string>();
		let current = showing;

		for (const id of ids) {
			const planned = duplicatePlan({ id, list: null, groupId: null, show: false })(current, facts);

			if (isRefusal(planned)) {
				return planned;
			}

			current = planned.showing;
			copyOfTab.set(id, planned.extra);
		}

		return plannedWith(current, copyOfTab);
	};
}

interface CopyMoment {
	readonly now: PlacedPlaces;
	readonly flow: Flow;
	readonly birth: FlowBirth;
}

function withCopyAdded(
	{ now, flow, birth }: CopyMoment,
	copied: PlacesMove<Answer<Settled<CopyOfTab>>> | null,
): PlacesMove<FlowDuplicated> {
	const flows = copied?.next?.flows ?? now.flows;
	const place = flows === null ? null : placeAfterFlow(flows, flow.id);

	if (flows === null || place === null) {
		return refused(NO_FLOW.replace("{id}", flow.id));
	}

	const copyOfTab = copied?.answer.isRefused === false ? copied.answer.value.extra : new Map<string, string>();
	const copy: Flow = {
		...flow,
		id: birth.id,
		name: `${flow.name}${COPY_SUFFIX}`,
		layout: layoutWithFreshIds(layoutWithTabsRenamed(flow.layout, copyOfTab), mintedAcross(flows)),
		createdAt: birth.at,
		lastOpenedAt: birth.at,
		archivedAt: null,
	};
	return {
		next: { tabs: copied?.next?.tabs ?? now.tabs, flows: withFlowAdded(flows, copy, place) },
		reason: `flows ${flows.flows.length} → ${flows.flows.length + 1} (duplicate ${flow.id} as ${birth.id} with ${copyOfTab.size} tabs)`,
		answer: {
			isRefused: false,
			value: {
				extra: birth.id,
				effects: copied?.answer.isRefused === false ? copied.answer.value.effects : NO_EFFECTS,
			},
		},
	};
}

function mintedAcross(doc: FlowsDoc): number {
	return Math.max(0, ...doc.flows.map(({ layout }) => layout.minted));
}

function refused(reason: string): PlacesMove<FlowDuplicated> {
	return { next: null, reason, answer: { isRefused: true, reason } };
}
