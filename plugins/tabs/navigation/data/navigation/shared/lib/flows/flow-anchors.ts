import type { Flow, FlowAnchorFace, FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { tabArtOf } from "../rows/tab-face.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { withFlowChanged } from "./flow-docs.js";
import { HOME_TAB_APP } from "./flow-home-tabs.js";
import { flowTabIdsOf } from "./flow-nodes.js";

type KeptTab = PlacedTabs["tabs"][number];

export const DEFAULT_SESSION_NAME = "New session";

export const UNANCHORED: Pick<Flow, "anchorTabId" | "anchorFace" | "isNamedByHand"> = {
	anchorTabId: null,
	anchorFace: null,
	isNamedByHand: false,
};

export interface FlowLook {
	readonly name: string;
	readonly face: FlowAnchorFace | null;
}

export interface LookFacts {
	readonly placed: PlacedTabs;
	readonly apps: PlacedApps;
}

export interface AnchorKeeping extends LookFacts {
	readonly doc: FlowsDoc;
	readonly was: PlacedTabs;
}

export function flowLookOf(flow: Flow, { placed, apps }: LookFacts): FlowLook {
	if (flow.isNamedByHand) {
		return { name: flow.name, face: null };
	}

	const anchor = placed.tabs.find(({ id }) => id === flow.anchorTabId);
	return anchor === undefined ? { name: flow.name, face: flow.anchorFace } : anchorLookOf(anchor, flow, apps);
}

export function withAnchorsKept(keeping: AnchorKeeping): FlowsDoc {
	return keeping.doc.flows.reduce((kept, flow) => withAnchorKept(kept, flow, keeping), keeping.doc);
}

function anchorLookOf(anchor: KeptTab, flow: Flow, apps: PlacedApps): FlowLook {
	const name = anchor.label ?? anchor.title;

	if (name === null || name === "") {
		return { name: flow.name, face: null };
	}

	return { name, face: { art: tabArtOf(apps, anchor.app, anchor.lastAddress), address: anchor.lastAddress } };
}

function withAnchorKept(doc: FlowsDoc, flow: Flow, keeping: AnchorKeeping): FlowsDoc {
	if (flow.isNamedByHand) {
		return doc;
	}

	return flow.anchorTabId === null ? withAnchorChosen(doc, flow, keeping.placed) : withAnchorFrozen(doc, flow, keeping);
}

function withAnchorChosen(doc: FlowsDoc, flow: Flow, placed: PlacedTabs): FlowsDoc {
	if (flow.name !== DEFAULT_SESSION_NAME) {
		return doc;
	}

	const anchorTabId = flowTabIdsOf(flow).find((id) =>
		placed.tabs.some((tab) => tab.id === id && tab.app !== HOME_TAB_APP),
	);
	return anchorTabId === undefined ? doc : withFlowChanged(doc, flow.id, { anchorTabId });
}

function withAnchorFrozen(doc: FlowsDoc, flow: Flow, { was, placed, apps }: AnchorKeeping): FlowsDoc {
	const isClosing =
		was.tabs.some(({ id }) => id === flow.anchorTabId) && !placed.tabs.some(({ id }) => id === flow.anchorTabId);

	if (!isClosing) {
		return doc;
	}

	const { name, face } = flowLookOf(flow, { placed: was, apps });
	return withFlowChanged(doc, flow.id, { name, anchorFace: face });
}
