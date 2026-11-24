import type { Flow, FlowLayout, FlowNode, FlowPane, FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { flowNameOfTab } from "./flow-conversion.js";
import { withFlowAdded, withFlowChanged } from "./flow-docs.js";
import { tabFlowIdOf } from "./flow-ids.js";
import { layoutOfTabs } from "./flow-layouts.js";
import { flowLayoutBreaksOf, flowPlacesBreaksOf } from "./flow-laws.js";
import { flowPanesOf, flowTabIdsOf, panesOf } from "./flow-nodes.js";
import { layoutPruned, layoutWithTab } from "./flow-panes.js";

export interface FlowsHealed {
	readonly doc: FlowsDoc;
	readonly said: readonly string[];
}

export interface StrayFlowing {
	readonly placed: PlacedTabs;
	readonly strayIds: readonly string[];
	readonly why: string;
	readonly now: number;
}

const REPEATED_FLOWS = 'flows {before} → {after}: the later copies of "{ids}" dropped, a flow id stands once';
const REPEATED_FOLDERS = 'folders {before} → {after}: the later copies of "{ids}" merged into the first';
const PLACES_HEALED = "{breaks} → each flow stands in its first place, unknown ones dropped, placeless ones loose";
const LAYOUT_HEALED = 'flow "{flow}" ({why}): {before} → {after}';
const PANE_IDS_REPEAT = "pane ids repeat";
const TABS_STAND_EARLIER = "tabs {ids} stand in an earlier pane";
const STRAYS_OWN_FLOWS =
	"tabs {ids} stood in no flow and the old tabs refuse conversion ({why}) → each in a flow of its own";
const MINTED_PANE_PREFIX = "pane-m";

export function flowsHealed(doc: FlowsDoc): FlowsHealed {
	return [
		withRepeatedFlowsDropped,
		withRepeatedFoldersMerged,
		withFlowsInOnePlace,
		withLayoutsHealed,
	].reduce<FlowsHealed>((healed, heal) => heal(healed), { doc, said: [] });
}

export function withStraysInOwnFlows(doc: FlowsDoc, { placed, strayIds, why, now }: StrayFlowing): FlowsHealed {
	if (strayIds.length === 0) {
		return { doc, said: [] };
	}

	const flowed = strayIds.reduce((kept, tabId) => withStrayFlowed(kept, { tabId, placed, now }), doc);
	return {
		doc: flowed,
		said: [STRAYS_OWN_FLOWS.replace("{ids}", strayIds.join(", ")).replace("{why}", why)],
	};
}

interface StrayTab {
	readonly tabId: string;
	readonly placed: PlacedTabs;
	readonly now: number;
}

function withStrayFlowed(doc: FlowsDoc, { tabId, placed, now }: StrayTab): FlowsDoc {
	const flowId = tabFlowIdOf(tabId);
	const standing = doc.flows.find(({ id }) => id === flowId);

	if (standing !== undefined) {
		return withFlowChanged(doc, flowId, {
			layout: layoutWithTab(standing.layout, tabId, standing.layout.focusedPaneId),
		});
	}

	const flow: Flow = {
		id: flowId,
		name: flowNameOfTab(placed, tabId),
		icon: null,
		layout: layoutOfTabs({ flowId, mainTabId: tabId, tabIds: [tabId] }),
		createdAt: now,
		lastOpenedAt: now,
	};
	return withFlowAdded(doc, flow, { folderId: null, before: null });
}

function firstsById<Item extends { readonly id: string }>(items: readonly Item[]): readonly Item[] {
	return items.filter((item, at) => items.findIndex(({ id }) => id === item.id) === at);
}

function withRepeatedFlowsDropped({ doc, said }: FlowsHealed): FlowsHealed {
	const firsts = firstsById(doc.flows);

	if (firsts.length === doc.flows.length) {
		return { doc, said };
	}

	const repeated = doc.flows.filter((flow) => !firsts.includes(flow)).map(({ id }) => id);
	const told = REPEATED_FLOWS.replace("{before}", String(doc.flows.length))
		.replace("{after}", String(firsts.length))
		.replace("{ids}", repeated.join(", "));
	return { doc: { ...doc, flows: [...firsts] }, said: [...said, told] };
}

function withRepeatedFoldersMerged({ doc, said }: FlowsHealed): FlowsHealed {
	const firsts = firstsById(doc.folders);

	if (firsts.length === doc.folders.length) {
		return { doc, said };
	}

	const folders = firsts.map((first) => ({
		...first,
		flowIds: doc.folders.filter(({ id }) => id === first.id).flatMap(({ flowIds }) => flowIds),
	}));
	const repeated = doc.folders.filter((folder) => !firsts.includes(folder)).map(({ id }) => id);
	const told = REPEATED_FOLDERS.replace("{before}", String(doc.folders.length))
		.replace("{after}", String(firsts.length))
		.replace("{ids}", repeated.join(", "));
	return { doc: { ...doc, folders }, said: [...said, told] };
}

function withFlowsInOnePlace({ doc, said }: FlowsHealed): FlowsHealed {
	const breaks = flowPlacesBreaksOf(doc);

	if (breaks.length === 0) {
		return { doc, said };
	}

	const flowIds = new Set(doc.flows.map(({ id }) => id));
	const [looseFlowIds = [], ...folderFlowIds] = firstOccurrencesOf(
		[doc.looseFlowIds, ...doc.folders.map((folder) => folder.flowIds)].map((ids) =>
			ids.filter((id) => flowIds.has(id)),
		),
		new Set(),
	);
	const placed = new Set([looseFlowIds, ...folderFlowIds].flat());
	const placeless = doc.flows.map(({ id }) => id).filter((id) => !placed.has(id));
	const healed: FlowsDoc = {
		...doc,
		looseFlowIds: [...looseFlowIds, ...placeless],
		folders: doc.folders.map((folder, at) => ({ ...folder, flowIds: folderFlowIds[at] ?? [] })),
	};
	return { doc: healed, said: [...said, PLACES_HEALED.replace("{breaks}", breaks.join("; "))] };
}

function firstOccurrencesOf(lists: readonly (readonly string[])[], taken: ReadonlySet<string>): readonly string[][] {
	const seen = new Set(taken);
	return lists.map((ids) =>
		ids.filter((id) => {
			const isFirst = !seen.has(id);
			seen.add(id);
			return isFirst;
		}),
	);
}

interface LayoutsHealing {
	readonly flows: readonly Flow[];
	readonly seen: ReadonlySet<string>;
	readonly said: readonly string[];
}

function withLayoutsHealed({ doc, said }: FlowsHealed): FlowsHealed {
	const healing = doc.flows.reduce<LayoutsHealing>((sofar, flow) => withLayoutHealed(sofar, flow), {
		flows: [],
		seen: new Set(),
		said,
	});
	const isUnchanged = healing.flows.every((flow, at) => flow === doc.flows[at]);
	return isUnchanged ? { doc, said } : { doc: { ...doc, flows: [...healing.flows] }, said: healing.said };
}

function withLayoutHealed({ flows, seen, said }: LayoutsHealing, flow: Flow): LayoutsHealing {
	const layout = withPaneIdsOnce(flow.layout);
	const keptTabs = keptTabsOfPanes(panesOf(layout.root), seen);
	const tabIds = [...keptTabs.values()].flat();
	const nowSeen = new Set([...seen, ...tabIds]);
	const why = healingReasonsOf({ flow, layout, keptTabs });

	if (why.length === 0) {
		return { flows: [...flows, flow], seen: nowSeen, said };
	}

	const healed = { ...flow, layout: layoutPruned(layout, (pane) => paneKept(pane, keptTabs.get(pane.id) ?? [])) };
	const told = LAYOUT_HEALED.replace("{flow}", flow.id)
		.replace("{why}", why.join("; "))
		.replace("{before}", paneSummaryOf(flow))
		.replace("{after}", paneSummaryOf(healed));
	return { flows: [...flows, healed], seen: nowSeen, said: [...said, told] };
}

interface LayoutLook {
	readonly flow: Flow;
	readonly layout: FlowLayout;
	readonly keptTabs: ReadonlyMap<string, readonly string[]>;
}

function healingReasonsOf({ flow, layout, keptTabs }: LayoutLook): readonly string[] {
	const kept = new Set([...keptTabs.values()].flat());
	const dropped = flowTabIdsOf(flow).filter((id, at, all) => all.indexOf(id) !== at || !kept.has(id));
	return [
		...flowLayoutBreaksOf(flow),
		...(layout === flow.layout ? [] : [PANE_IDS_REPEAT]),
		...(dropped.length === 0 ? [] : [TABS_STAND_EARLIER.replace("{ids}", [...new Set(dropped)].join(", "))]),
	];
}

function keptTabsOfPanes(
	panes: readonly FlowPane[],
	seen: ReadonlySet<string>,
): ReadonlyMap<string, readonly string[]> {
	const kept = firstOccurrencesOf(
		panes.map(({ tabIds }) => tabIds),
		seen,
	);
	return new Map(panes.map(({ id }, at) => [id, kept[at] ?? []]));
}

function paneKept(pane: FlowPane, tabIds: readonly string[]): FlowPane | null {
	if (tabIds.length === 0) {
		return null;
	}

	const activeTabId = pane.activeTabId !== null && tabIds.includes(pane.activeTabId) ? pane.activeTabId : tabIds[0];
	return {
		...pane,
		tabIds: [...tabIds],
		activeTabId: activeTabId ?? null,
	};
}

function withPaneIdsOnce(layout: FlowLayout): FlowLayout {
	const ids = panesOf(layout.root).map(({ id }) => id);

	if (new Set(ids).size === ids.length) {
		return layout;
	}

	const renaming = { minted: layout.minted, seen: new Set<string>() };
	const root = panesRenamed(layout.root, (pane) => {
		if (!renaming.seen.has(pane.id)) {
			renaming.seen.add(pane.id);
			return pane;
		}

		renaming.minted = freeMintOf(renaming.minted + 1, ids);
		return { ...pane, id: `${MINTED_PANE_PREFIX}${renaming.minted}` };
	});
	return { ...layout, root, minted: renaming.minted };
}

function freeMintOf(from: number, taken: readonly string[]): number {
	return taken.includes(`${MINTED_PANE_PREFIX}${from}`) ? freeMintOf(from + 1, taken) : from;
}

function panesRenamed(node: FlowNode, rename: (pane: FlowPane) => FlowPane): FlowNode {
	if (node.kind === "pane") {
		return rename(node);
	}

	return {
		...node,
		children: node.children.map((child) => panesRenamed(child, rename)),
	};
}

function paneSummaryOf(flow: Flow): string {
	return flowPanesOf(flow)
		.map(({ id, tabIds }) => `${id}[${tabIds.join(",")}]`)
		.join(" ");
}
