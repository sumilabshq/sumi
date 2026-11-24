import type { Flow, FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { flowsOf } from "./flow-conversion.js";
import { withFlowAdded, withFlowChanged, withoutFlow } from "./flow-docs.js";
import { flowBreaksOf } from "./flow-laws.js";
import type { MovePlaces, PlacedPlaces } from "./flow-moves.js";
import { flowTabIdsOf } from "./flow-nodes.js";
import { layoutWithTab, layoutWithoutTabs } from "./flow-panes.js";

export interface ReconcileFacts {
	readonly apps: PlacedApps;
	readonly now: () => number;
}

const LAWS_BROKEN = "the flows would break their laws, nothing written: {reasons}";
const NOT_ADOPTED =
	"[widgetarium] navigation flows: tabs {ids} stand in no flow and the old tabs refuse conversion: {reasons}";

export function reconciling<T>(move: MovePlaces<T>, facts: ReconcileFacts | null): MovePlaces<T> {
	return (now) => {
		const moved = move(now);

		if (facts === null || moved.next === null || moved.next.flows === null) {
			return moved;
		}

		return {
			...moved,
			next: placesReconciled({ tabs: moved.next.tabs, flows: moved.next.flows }, facts),
		};
	};
}

function placesReconciled(
	next: { readonly tabs: PlacedTabs; readonly flows: FlowsDoc },
	facts: ReconcileFacts,
): PlacedPlaces {
	const liveIds = next.tabs.tabs.map(({ id }) => id);
	const tidy = withoutGoneTabs(next.flows, new Set(liveIds));
	const adopted = withStraysAdopted(tidy, next.tabs, facts);
	const breaks = flowBreaksOf(adopted, liveIds);

	if (breaks.length > 0) {
		throw new Error(LAWS_BROKEN.replace("{reasons}", breaks.join("; ")));
	}

	return {
		tabs: next.tabs,
		flows: adopted,
	};
}

function withoutGoneTabs(doc: FlowsDoc, live: ReadonlySet<string>): FlowsDoc {
	return doc.flows.reduce((kept, flow) => {
		const gone = new Set(flowTabIdsOf(flow).filter((id) => !live.has(id)));

		if (gone.size === 0) {
			return kept;
		}

		const isEmptied = gone.size === flowTabIdsOf(flow).length;
		return isEmptied
			? withoutFlow(kept, flow.id)
			: withFlowChanged(kept, flow.id, { layout: layoutWithoutTabs(flow.layout, gone) });
	}, doc);
}

function withStraysAdopted(doc: FlowsDoc, placed: PlacedTabs, { apps, now }: ReconcileFacts): FlowsDoc {
	const standing = new Set(doc.flows.flatMap(flowTabIdsOf));
	const strays = new Set(placed.tabs.map(({ id }) => id).filter((id) => !standing.has(id)));

	if (strays.size === 0) {
		return doc;
	}

	const canonical = flowsOf({ placed, apps, sourceRev: 0, now: now() });

	if (canonical.isRefused) {
		console.error(
			NOT_ADOPTED.replace("{ids}", [...strays].join(", ")).replace("{reasons}", canonical.reasons.join("; ")),
		);
		return doc;
	}

	return canonical.doc.flows.reduce(
		(adopted, flow) => withFlowAdopted(adopted, { flow, canonical: canonical.doc, strays }),
		doc,
	);
}

interface Adoption {
	readonly flow: Flow;
	readonly canonical: FlowsDoc;
	readonly strays: ReadonlySet<string>;
}

function withFlowAdopted(doc: FlowsDoc, { flow, canonical, strays }: Adoption): FlowsDoc {
	const strayIds = flowTabIdsOf(flow).filter((id) => strays.has(id));

	if (strayIds.length === 0) {
		return doc;
	}

	const standing = doc.flows.find(({ id }) => id === flow.id);

	if (standing !== undefined) {
		const layout = strayIds.reduce((kept, id) => layoutWithTab(kept, id, kept.focusedPaneId), standing.layout);
		return withFlowChanged(doc, flow.id, { layout });
	}

	const others = new Set(flowTabIdsOf(flow).filter((id) => !strays.has(id)));
	const folderId = canonical.folders.find((folder) => folder.flowIds.includes(flow.id))?.id ?? null;
	const place = {
		folderId: doc.folders.some(({ id }) => id === folderId) ? folderId : null,
		before: null,
	};
	return withFlowAdded(doc, { ...flow, layout: layoutWithoutTabs(flow.layout, others) }, place);
}
