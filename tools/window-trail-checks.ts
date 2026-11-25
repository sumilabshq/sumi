import { check } from "./check-helpers.ts";
import {
	steppedTrailOf,
	trailOf,
	withViewsRecorded,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/window-trails.ts";
import type { FlowsDoc, ViewSpot } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import type { PlacedTabs } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";

const MAIN = "main";
const OTHER = "other";
const MOST_STEPS_KEPT = 50;

const spot = (flowId: string, tabId: string): ViewSpot => ({ flowId, tabId });

function flowOf(id: string, tabIds: readonly string[], activeTabId: string): FlowsDoc["flows"][number] {
	return {
		id,
		name: id,
		icon: null,
		layout: { root: { kind: "pane", id: `pane-${id}`, tabIds, activeTabId }, focusedPaneId: `pane-${id}`, minted: 1 },
		createdAt: 1,
		lastOpenedAt: 1,
	};
}

function docOf(windowFlows: Record<string, string>, windowTrails?: FlowsDoc["windowTrails"]): FlowsDoc {
	return {
		v: 1,
		flows: [flowOf("a", ["a1", "a2"], "a1"), flowOf("b", ["b1"], "b1"), flowOf("c", ["c1"], "c1")],
		folders: [],
		looseFlowIds: ["a", "b", "c"],
		setups: [],
		windowFlows,
		inboxUndo: null,
		windowTrails,
		conversion: null,
	};
}

function placedOf(windows: readonly string[]): PlacedTabs {
	return PlacedTabsSchema.parse({
		tabs: [],
		lists: {},
		minted: 0,
		closed: [],
		windows: windows.map((label) => ({ label, openedAt: 1 })),
	});
}

function withTabShown(doc: FlowsDoc, flowId: string, tabId: string): FlowsDoc {
	return {
		...doc,
		flows: doc.flows.map((flow) =>
			flow.id === flowId && flow.layout.root.kind === "pane"
				? { ...flow, layout: { ...flow.layout, root: { ...flow.layout.root, activeTabId: tabId } } }
				: flow,
		),
	};
}

function recordingChecks(): void {
	const start = docOf({ [MAIN]: "a", [OTHER]: "c" });
	const switched = withViewsRecorded(start, withTabShown(start, "a", "a2"));
	check("trail law: a tab switch records the view it left", trailOf(switched, MAIN), {
		back: [spot("a", "a1")],
		forward: [],
	});
	const renamed = { ...switched, flows: switched.flows.map((flow) => ({ ...flow, name: `${flow.name}!` })) };
	check("trail law: a write that moves no view records nothing", withViewsRecorded(switched, renamed), renamed);
	const stepped = docOf({ [MAIN]: "b", [OTHER]: "a" }, { [MAIN]: { back: [], forward: [spot("a", "a1")] } });
	const both = withViewsRecorded(start, stepped);
	check("trail law: a window whose trail a step wrote keeps that trail", trailOf(both, MAIN), trailOf(stepped, MAIN));
	check("trail law: another window still records beside a step", trailOf(both, OTHER).back, [spot("c", "c1")]);
}

function steppingChecks(): void {
	const placed = placedOf([MAIN, OTHER]);
	const withGone = docOf(
		{ [MAIN]: "a", [OTHER]: "b" },
		{
			[MAIN]: { back: [spot("c", "c1"), spot("b", "b1"), spot("a", "gone")], forward: [] },
		},
	);
	const back = steppedTrailOf({ doc: withGone, placed, window: MAIN }, "back");
	check("trail law: Back skips a removed tab and a Flow held by another window", back?.to, spot("c", "c1"));
	check("trail law: the removed tab is dropped, the held Flow is kept ahead", back?.trail, {
		back: [],
		forward: [spot("b", "b1"), spot("a", "a1")],
	});
	const there = docOf({ [MAIN]: "c", [OTHER]: "b" }, back === null ? undefined : { [MAIN]: back.trail });
	const forward = steppedTrailOf({ doc: there, placed, window: MAIN }, "forward");
	check("trail law: Forward skips the held Flow and comes back", forward?.to, spot("a", "a1"));
	check("trail law: the held Flow is kept behind", forward?.trail.back, [spot("c", "c1"), spot("b", "b1")]);
	const empty = docOf({ [MAIN]: "a" });
	check("trail law: nothing to go back to is null", steppedTrailOf({ doc: empty, placed, window: MAIN }, "back"), null);
}

function capChecks(): void {
	let doc = docOf({ [MAIN]: "a" });

	for (let at = 0; at < MOST_STEPS_KEPT + 5; at += 1) {
		const next = withTabShown(doc, "a", at % 2 === 0 ? "a2" : "a1");
		doc = withViewsRecorded(doc, next);
	}

	check("trail law: the trail keeps at most 50 steps", trailOf(doc, MAIN).back.length, MOST_STEPS_KEPT);
}

export function trailLawChecks(): void {
	recordingChecks();
	steppingChecks();
	capChecks();
}
