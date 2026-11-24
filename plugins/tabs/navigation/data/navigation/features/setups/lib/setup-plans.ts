import { flowOfId, placeProblemOf, withFlowAdded } from "../../../shared/lib/flows/flow-docs.js";
import { layoutOfTabs } from "../../../shared/lib/flows/flow-layouts.js";
import type { FlowsPlan, MovePlaces } from "../../../shared/lib/flows/flow-moves.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import type { Answer } from "../../../shared/lib/settling/settling.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { openTabUnshown, tabsWith } from "../../../shared/lib/tabs/host-tabs.js";
import { momentOfWindow, placedWith } from "../../../shared/lib/tabs/kept-tabs.js";
import { WORKSPACE_END } from "../../../shared/lib/tabs/tab-lists.js";
import type { Flow, FlowNode, Setup, SetupNode } from "../../../shared/schema/flows.schema.js";
import type { StartSetupAskSchema } from "../../../shared/schema/flow-asks.schema.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import type { z } from "zod";

type StartSetupAsk = z.infer<typeof StartSetupAskSchema>;

export interface SetupBirth {
	readonly id: string;
	readonly at: number;
}

export interface SetupTabSpec {
	readonly app: string;
	readonly address: string | null;
}

const NO_FLOW = 'no flow "{id}" stands here';
const NO_SETUP = 'no setup "{id}" stands here';
const NOT_CONVERTED = "the workspace holds no flows yet: it is not converted";

export function saveSetupPlan(
	ask: { readonly flowId: string; readonly name: string },
	id: string,
): FlowsPlan<{ readonly setupId: string }> {
	return ({ tabs, flows }) => {
		const flow = flowOfId(flows, ask.flowId);

		if (flow === undefined) {
			return refusal(NO_FLOW.replace("{id}", ask.flowId));
		}

		if (flows.setups.some((setup) => setup.id === id)) {
			return { flows, reason: `setup ${id} stands already, save skipped`, value: { setupId: id } };
		}

		const setup: Setup = { id, name: ask.name, icon: null, root: setupNodeOf(flow.layout.root, tabs) };
		return {
			flows: { ...flows, setups: [...flows.setups, setup] },
			reason: `setups ${flows.setups.length} → ${flows.setups.length + 1} (save ${id} "${ask.name}" from ${ask.flowId})`,
			value: { setupId: id },
		};
	};
}

export function removeSetupPlan(setupId: string): FlowsPlan<null> {
	return ({ flows }) => {
		if (!flows.setups.some(({ id }) => id === setupId)) {
			return refusal(NO_SETUP.replace("{id}", setupId));
		}

		return {
			flows: { ...flows, setups: flows.setups.filter(({ id }) => id !== setupId) },
			reason: `setup ${setupId} removed`,
			value: null,
		};
	};
}

export function startSetupMove(
	ask: StartSetupAsk,
	birth: SetupBirth,
	apps: PlacedApps,
): MovePlaces<Answer<{ readonly flowId: string }>> {
	return (now) => {
		const refused = (reason: string): ReturnType<MovePlaces<Answer<{ readonly flowId: string }>>> => ({
			next: null,
			reason,
			answer: { isRefused: true, reason },
		});
		const setup = now.flows?.setups.find(({ id }) => id === ask.setupId);

		if (now.flows === null || setup === undefined) {
			return refused(now.flows === null ? NOT_CONVERTED : NO_SETUP.replace("{id}", ask.setupId));
		}

		if (flowOfId(now.flows, birth.id) !== undefined) {
			return {
				next: null,
				reason: `flow ${birth.id} stands already, start skipped`,
				answer: { isRefused: false, value: { flowId: birth.id } },
			};
		}

		const problem = placeProblemOf(now.flows, ask.place);

		if (problem !== null) {
			return refused(problem);
		}

		const created = tabsCreatedFor(setup, { placed: now.tabs, apps });
		const flow: Flow = {
			id: birth.id,
			name: setup.name,
			icon: setup.icon,
			layout: layoutOfSetup(setup.root, birth.id, created.tabIds),
			createdAt: birth.at,
			lastOpenedAt: birth.at,
			archivedAt: null,
		};
		return {
			next: { tabs: created.placed, flows: withFlowAdded(now.flows, flow, ask.place) },
			reason: `flows ${now.flows.flows.length} → ${now.flows.flows.length + 1} (start ${birth.id} from setup ${setup.id} with ${created.tabIds.length} tabs)`,
			answer: { isRefused: false, value: { flowId: birth.id } },
		};
	};
}

export function setupNodeOf(node: FlowNode, placed: PlacedTabs): SetupNode {
	if (node.kind === "split") {
		return {
			kind: "split",
			dir: node.dir,
			children: node.children.map((child) => setupNodeOf(child, placed)),
			shares: node.shares,
		};
	}

	return {
		kind: "pane",
		tabs: node.tabIds.flatMap((id) => {
			const tab = placed.tabs.find((one) => one.id === id);
			return tab === undefined ? [] : [{ app: tab.app, address: tab.lastAddress }];
		}),
	};
}

export function tabSpecsOf(node: SetupNode): readonly SetupTabSpec[] {
	return node.kind === "pane" ? node.tabs : node.children.flatMap(tabSpecsOf);
}

interface TabsCreated {
	readonly placed: PlacedTabs;
	readonly tabIds: readonly string[];
}

interface CreationFacts {
	readonly placed: PlacedTabs;
	readonly apps: PlacedApps;
}

function tabsCreatedFor(setup: Setup, { placed, apps }: CreationFacts): TabsCreated {
	const specs = tabSpecsOf(setup.root);
	const created = specs.reduce<{ readonly moment: HostTabsMoment; readonly ids: readonly string[] }>(
		(was, spec) => {
			const place = was.ids[0] === undefined ? WORKSPACE_END : { chatId: was.ids[0], groupId: null, before: null };
			const opened = openTabUnshown(was.moment, { app: spec.app, pageId: null }, place);
			const moment =
				spec.address === null
					? opened.moment
					: { ...opened.moment, tabs: tabsWith(opened.moment, opened.tab.id, { lastAddress: spec.address }) };
			return { moment, ids: [...was.ids, opened.tab.id] };
		},
		{ moment: momentOfWindow(placed, null, apps), ids: [] },
	);
	return { placed: placedWith(placed, null, created.moment), tabIds: created.ids };
}

function layoutOfSetup(root: SetupNode, flowId: string, tabIds: readonly string[]): Flow["layout"] {
	const counter = { tab: 0, pane: 0 };
	const made = flowNodeOfSetup(root, { flowId, tabIds, counter });

	if (made === null) {
		return layoutOfTabs({ flowId, mainTabId: "", tabIds: [] });
	}

	const firstPane = firstPaneOf(made);
	return { root: made, focusedPaneId: firstPane, minted: counter.pane };
}

interface SetupWalk {
	readonly flowId: string;
	readonly tabIds: readonly string[];
	readonly counter: { tab: number; pane: number };
}

function flowNodeOfSetup(node: SetupNode, walk: SetupWalk): FlowNode | null {
	if (node.kind === "pane") {
		const ids = node.tabs.map(() => walk.tabIds[walk.counter.tab++] ?? "").filter((id) => id !== "");
		walk.counter.pane += 1;
		return ids.length === 0
			? null
			: { kind: "pane", id: `${walk.flowId}-pane-${walk.counter.pane}`, tabIds: ids, activeTabId: ids[0] ?? null };
	}

	const survivors = node.children.flatMap((child, at) => {
		const made = flowNodeOfSetup(child, walk);
		return made === null ? [] : [{ made, share: node.shares[at] ?? 1 }];
	});
	const [only] = survivors;

	if (survivors.length <= 1) {
		return only?.made ?? null;
	}

	walk.counter.pane += 1;
	return {
		kind: "split",
		id: `${walk.flowId}-split-${walk.counter.pane}`,
		dir: node.dir,
		children: survivors.map(({ made }) => made),
		shares: survivors.map(({ share }) => share),
	};
}

function firstPaneOf(node: FlowNode): string {
	return node.kind === "pane" ? node.id : node.children[0] === undefined ? node.id : firstPaneOf(node.children[0]);
}
