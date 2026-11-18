import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { tabBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { holdersOf, viewsSettled } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-leases.ts";
import { momentAt, placedWith } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";

const ids = Array.from({ length: 1000 }, (_n, at) => `tab-${at + 1}`);
const placed = PlacedTabsSchema.parse({
	tabs: ids.map((id) => ({ id, app: "canvas", pageId: null, label: null })),
	lists: { workspace: ids.map((id) => ({ kind: "tab", id })) },
	views: Object.fromEntries(
		Array.from({ length: 20 }, (_n, at) => [`w${at}`, { shownId: `tab-${at + 1}`, view: "canvas" }]),
	),
	windows: Array.from({ length: 20 }, (_n, at) => ({ label: `w${at}`, openedAt: at })),
	minted: 1000,
	closed: [],
});
const timeOf = (what: string, run: () => unknown, times = 50): void => {
	const started = performance.now();
	for (let at = 0; at < times; at += 1) run();
	console.log(`${what}: ${((performance.now() - started) / times).toFixed(2)} ms`);
};
const moment = momentAt(placed, { window: "w0", tabWindows: new Map() }, BUILT_IN_APPS);
timeOf("PlacedTabsSchema.parse", () => PlacedTabsSchema.parse(placed));
timeOf("tabBreaksOf", () => tabBreaksOf(moment));
timeOf("holdersOf", () => holdersOf(placed));
timeOf("viewsSettled", () => viewsSettled(placed));
timeOf("momentAt", () => momentAt(placed, { window: "w0", tabWindows: new Map() }, BUILT_IN_APPS));
timeOf("placedWith", () => placedWith(placed, "w0", moment));
