import type { z } from "zod";
import { withFlowChanged } from "../../../shared/lib/flows/flow-docs.js";
import { tabsMoveAsPlaces } from "../../../shared/lib/flows/flow-moves.js";
import type { MovePlaces, PlacedPlaces, PlacesMove } from "../../../shared/lib/flows/flow-moves.js";
import { flowPanesOf, flowTabIdsOf } from "../../../shared/lib/flows/flow-nodes.js";
import {
	isRefusedEdit,
	layoutWithSplit,
	layoutWithTabMoved,
	layoutWithTabShown,
} from "../../../shared/lib/flows/flow-pane-edits.js";
import type { LayoutEdit } from "../../../shared/lib/flows/flow-pane-edits.js";
import { layoutWithTab } from "../../../shared/lib/flows/flow-panes.js";
import { settlingWith } from "../../../shared/lib/settling/settling.js";
import type { Answer, Settled } from "../../../shared/lib/settling/settling.js";
import { openPlan } from "../../../shared/lib/showing/opening-plans.js";
import { resolvedAppOf } from "../../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import { chatIdOf } from "../../../shared/lib/tabs/host-tabs.js";
import type { OpenLinkTabAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { Flow, FlowPane, FlowsDoc } from "../../../shared/schema/flows.schema.js";

type OpenLinkTabAsk = z.infer<typeof OpenLinkTabAskSchema>;
type LinkTabAnswer = Answer<Settled<string | null>>;

interface LinkHome {
	readonly flow: Flow;
	readonly pane: FlowPane;
}

const NO_FLOWS = "the workspace holds no flows: the link opens the old way";
const NO_HOME = 'no flow holds the tab "{id}" the link was pressed in';
const SPLIT_SIDE = "right";

export function openLinkTabMove(ask: OpenLinkTabAsk, apps: PlacedApps): MovePlaces<LinkTabAnswer> {
	return (now) => {
		if (now.flows === null) {
			return { next: null, reason: NO_FLOWS, answer: { isRefused: false, value: { effects: [], extra: null } } };
		}

		const homeTabId = homeTabIdOf(now, apps, ask.homeId);
		const home = linkHomeOf(now.flows, homeTabId);

		if (home === undefined) {
			return refusedMove(NO_HOME.replace("{id}", ask.homeId));
		}

		const heldId = heldTabIdOf(now, home.flow, ask, apps);
		return heldId === undefined ? openedBeside(now, { ask, apps, home, homeTabId }) : shownHeld(now, home.flow, heldId);
	};
}

function homeTabIdOf({ tabs }: PlacedPlaces, apps: PlacedApps, homeId: string): string {
	return (
		(tabs.tabs.find(({ id }) => id === homeId) ?? tabs.tabs.find((tab) => chatIdOf(apps, tab) === homeId))?.id ?? homeId
	);
}

function linkHomeOf(doc: FlowsDoc, tabId: string): LinkHome | undefined {
	for (const flow of doc.flows) {
		const pane = flowPanesOf(flow).find(({ tabIds }) => tabIds.includes(tabId));

		if (pane !== undefined) {
			return { flow, pane };
		}
	}

	return undefined;
}

function heldTabIdOf(
	{ tabs }: PlacedPlaces,
	flow: Flow,
	{ app, address }: OpenLinkTabAsk,
	apps: PlacedApps,
): string | undefined {
	const inFlow = new Set(flowTabIdsOf(flow));
	const opensIn = resolvedAppOf(apps, app, address);
	return tabs.tabs.find((tab) => inFlow.has(tab.id) && tab.app === opensIn && tab.lastAddress === address)?.id;
}

function shownHeld(now: PlacedPlaces, flow: Flow, heldId: string): PlacesMove<LinkTabAnswer> {
	const answer: LinkTabAnswer = { isRefused: false, value: { effects: [], extra: heldId } };
	return withLayoutEdited(now, {
		flow,
		edit: layoutWithTabShown(flow.layout, heldId),
		answer,
		said: `shows the held ${heldId}`,
	});
}

interface BesideOpening {
	readonly ask: OpenLinkTabAsk;
	readonly apps: PlacedApps;
	readonly home: LinkHome;
	readonly homeTabId: string;
}

function openedBeside(now: PlacedPlaces, { ask, apps, home, homeTabId }: BesideOpening): PlacesMove<LinkTabAnswer> {
	const unshown = { app: ask.app, address: ask.address, list: null, groupId: null, show: false, reusesHeld: false };
	const opened = tabsMoveAsPlaces(settlingWith(ask.at, apps, openPlan(unshown)))(now);

	if (opened.answer.isRefused || opened.next === null) {
		return opened;
	}

	const tabId = opened.answer.value.extra;
	const answer: LinkTabAnswer = opened.answer;
	const edit = layoutBesideOf(home, { tabId, besideTabId: homeTabId, place: ask.place });
	return withLayoutEdited(opened.next, {
		flow: home.flow,
		edit,
		answer,
		said: `${opened.reason}; ${tabId} ${ask.place}`,
	});
}

interface BesidePlacing {
	readonly tabId: string;
	readonly besideTabId: string;
	readonly place: OpenLinkTabAsk["place"];
}

function layoutBesideOf({ flow, pane }: LinkHome, { tabId, besideTabId, place }: BesidePlacing): LayoutEdit {
	const before = pane.tabIds[pane.tabIds.indexOf(besideTabId) + 1] ?? null;
	const added = layoutWithTabMoved(layoutWithTab(flow.layout, tabId, pane.id), { tabId, paneId: pane.id, before });

	if (place === "beside" || isRefusedEdit(added)) {
		return added;
	}

	return layoutWithSplit(added, { paneId: pane.id, side: SPLIT_SIDE, tabId });
}

interface LayoutEditing {
	readonly flow: Flow;
	readonly edit: LayoutEdit;
	readonly answer: LinkTabAnswer;
	readonly said: string;
}

function withLayoutEdited(now: PlacedPlaces, { flow, edit, answer, said }: LayoutEditing): PlacesMove<LinkTabAnswer> {
	if (isRefusedEdit(edit)) {
		return refusedMove(edit);
	}

	if (now.flows === null) {
		return refusedMove(NO_FLOWS);
	}

	return {
		next: { tabs: now.tabs, flows: withFlowChanged(now.flows, flow.id, { layout: edit }) },
		reason: `flow ${flow.id} ${said}`,
		answer,
	};
}

function refusedMove(reason: string): PlacesMove<LinkTabAnswer> {
	return { next: null, reason, answer: { isRefused: true, reason } };
}
