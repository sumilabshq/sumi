import type { Flow, FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { flowsOf } from "./flow-conversion.js";
import { withFlowAdded, withFlowChanged, withoutFlow } from "./flow-docs.js";
import { withFolderColorsFilled } from "./flow-folder-colors.js";
import { flowsHealed, withStraysInOwnFlows } from "./flow-healing.js";
import type { FlowsHealed } from "./flow-healing.js";
import { flowBreaksOf } from "./flow-laws.js";
import type { MovePlaces } from "./flow-moves.js";
import { flowTabIdsOf } from "./flow-nodes.js";
import { layoutWithTab, layoutWithoutTabs } from "./flow-panes.js";

export interface ReconcileFacts {
	readonly apps: PlacedApps;
	readonly now: () => number;
}

interface PlacesToReconcile {
	readonly tabs: PlacedTabs;
	readonly flows: FlowsDoc;
}

const LAWS_BROKEN = "the flows would break their laws even after healing, nothing written: {reasons}";
const UNHEALED_STATE = "[widgetarium] navigation flows cannot heal: {reasons}. Live tabs {live}. Flows {flows}";
const HEALED = "[widgetarium] navigation flows healed: {said}";

export function reconciling<T>(move: MovePlaces<T>, facts: ReconcileFacts | null): MovePlaces<T> {
	return (now) => {
		const moved = move(now);

		if (facts === null || moved.next === null || moved.next.flows === null) {
			return moved;
		}

		const reconciled = placesReconciled({ tabs: moved.next.tabs, flows: moved.next.flows }, facts);

		if (reconciled.said.length === 0) {
			return { ...moved, next: { tabs: moved.next.tabs, flows: reconciled.doc } };
		}

		const said = reconciled.said.join("; ");
		console.warn(HEALED.replace("{said}", () => said));
		return {
			...moved,
			next: { tabs: moved.next.tabs, flows: reconciled.doc },
			reason: `${moved.reason}; healed: ${said}`,
		};
	};
}

function placesReconciled(next: PlacesToReconcile, facts: ReconcileFacts): FlowsHealed {
	const liveIds = next.tabs.tabs.map(({ id }) => id);
	const healed = flowsHealed(next.flows);
	const colored = withFolderColorsFilled(healed.doc, next.tabs.groups);
	const tidy = withoutGoneTabs(colored.doc, new Set(liveIds));
	const adopted = withStraysAdopted({ doc: tidy, said: [...healed.said, ...colored.said] }, next.tabs, facts);
	const breaks = flowBreaksOf(adopted.doc, liveIds);

	if (breaks.length > 0) {
		refuseUnhealed(breaks, { tabs: next.tabs, flows: adopted.doc });
	}

	return adopted;
}

function refuseUnhealed(breaks: readonly string[], state: PlacesToReconcile): never {
	const reasons = breaks.join("; ");
	console.error(
		UNHEALED_STATE.replace("{reasons}", () => reasons)
			.replace("{live}", () => JSON.stringify(state.tabs.tabs.map(({ id }) => id)))
			.replace("{flows}", () => JSON.stringify(state.flows)),
	);
	throw new Error(LAWS_BROKEN.replace("{reasons}", () => reasons));
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

function withStraysAdopted({ doc, said }: FlowsHealed, placed: PlacedTabs, { apps, now }: ReconcileFacts): FlowsHealed {
	const standing = new Set(doc.flows.flatMap(flowTabIdsOf));
	const strays = new Set(placed.tabs.map(({ id }) => id).filter((id) => !standing.has(id)));

	if (strays.size === 0) {
		return { doc, said };
	}

	const canonical = flowsOf({ placed, apps, sourceRev: 0, now: now() });

	if (canonical.isRefused) {
		const flowed = withStraysInOwnFlows(doc, {
			placed,
			strayIds: [...strays],
			why: canonical.reasons.join("; "),
			now: now(),
		});
		return { doc: flowed.doc, said: [...said, ...flowed.said] };
	}

	const adopted = canonical.doc.flows.reduce(
		(sofar, flow) => withFlowAdopted(sofar, { flow, canonical: canonical.doc, strays }),
		doc,
	);
	return { doc: adopted, said };
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
