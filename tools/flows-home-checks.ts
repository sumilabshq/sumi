import { runtime } from "../packages/shared/data-framework/src/index.ts";
import { homeLayout } from "../plugins/tabs/flows-home/data/home-layout/generated/contract.ts";
import { homeLayout as homeLayoutModule } from "../plugins/tabs/flows-home/data/home-layout/generated/module.ts";
import { appTilesOf } from "../plugins/tabs/flows-home/src/features/apps/lib/app-tiles-of.ts";
import { ageOf } from "../plugins/tabs/flows-home/src/features/continue/lib/age-of.ts";
import { launchOf, paneAppOf, queryTextOf } from "../plugins/tabs/flows-home/src/features/launcher/lib/launch-of.ts";
import { movedOnto, orderedBy } from "../plugins/tabs/flows-home/src/shared/lib/tile-order.ts";
import { spanAfterDrag } from "../plugins/tabs/flows-home/src/shared/lib/tile-span.ts";
import { check, tally } from "./check-helpers.ts";

type Results = NonNullable<Parameters<typeof launchOf>[1]>;

const TERMINAL_ROW = {
	key: "app:terminal",
	kind: "app",
	title: "Terminal",
	isFallback: false,
	intent: { do: "open-app", app: "terminal", title: "Terminal" },
} as const;

function resultsOf(over: Partial<Results>): Results {
	return {
		door: "home",
		foundCount: null,
		sections: [],
		ghost: "",
		isLink: false,
		fallbackIntent: { do: "open-address", address: "typed", where: "new-tab" },
		fallbackLabel: "Search the web",
		askInk: { do: "ask-ink", text: "why", sends: true },
		...over,
	} as Results;
}

const withTerminal = resultsOf({ sections: [{ label: "Apps", layout: "list", rows: [TERMINAL_ROW] }] } as Partial<Results>);

check("an app name opens that app", launchOf("terminal", withTerminal)?.tag, "App");
check("an app name labels the row", launchOf("terminal", withTerminal)?.label, "Open Terminal");
check("an address opens the site", launchOf("github.com", resultsOf({ isLink: true }))?.tag, "Address");
check("an address wins over an app row", launchOf("github.com", { ...withTerminal, isLink: true })?.tag, "Address");
check("anything else searches the web", launchOf("best keyboard", resultsOf({}))?.tag, "No match");
check("? asks Sumi", launchOf("?why", resultsOf({}))?.tag, "AI");
check("/ runs a command", launchOf("/new flow", null)?.tag, "Command");
check("an unknown command does nothing", launchOf("/nothing", null), null);
check("a bare / does nothing", launchOf("/", null), null);
check("with no results nothing runs", launchOf("terminal", null), null);
check("empty text does nothing", launchOf("", resultsOf({})), null);
check("a command is queried as nothing", queryTextOf("/new flow"), "");
check("the ask prefix is not queried", queryTextOf("? why"), "why");
check("plain text is queried whole", queryTextOf("terminal"), "terminal");
check("only open-app goes through flows.openTab", [paneAppOf(TERMINAL_ROW.intent), paneAppOf({ do: "open-address", address: "a.b", where: "new-tab" })], ["terminal", null]);

check("a tile moves onto a later one: after it", movedOnto(["a", "b", "c", "d"], "a", "c"), ["b", "c", "a", "d"]);
check("a tile moves onto an earlier one: before it", movedOnto(["a", "b", "c", "d"], "d", "b"), ["a", "d", "b", "c"]);
check("a tile moved onto itself stays", movedOnto(["a", "b"], "a", "a"), ["a", "b"]);
check("an unknown target changes nothing", movedOnto(["a", "b"], "a", "z"), ["a", "b"]);
check("unknown ids go after the arranged ones, in listed order", orderedBy(["x", "b", "y", "a"], (id) => id, ["a", "b"]), ["a", "b", "x", "y"]);

const drag = { startX: 100, startSpan: 1, columnPx: 100 };
check("a corner pulled one column widens by one", spanAfterDrag(drag, 200), 2);
check("a corner pulled far stops at the widest span", spanAfterDrag(drag, 900), 3);
check("a corner pushed back stops at one", spanAfterDrag({ ...drag, startSpan: 2 }, -400), 1);

const face = (id: string) => ({ id, title: id, iconUrl: null, art: null, isListed: true });
const tiles = appTilesOf(
	[face("canvas"), face("terminal"), face("git")],
	{ setupIds: [], apps: [{ app: "git", span: 2 }, { app: "canvas", span: 1 }], hiddenApps: ["terminal"] },
	(id) => `art-${id}`,
);
check("app tiles follow the kept order, without hidden ones", tiles.map(({ id }) => id), ["git", "canvas"]);
check("an app tile keeps its size and art", [tiles[0]?.span, tiles[0]?.art], [2, "art-git"]);

check("a minute ago is shown as now at once", ageOf(1000, 1000 + 59_000), "now");
check("minutes", ageOf(0, 5 * 60_000), "5m");
check("hours", ageOf(0, 2 * 3_600_000), "2h");
check("days", ageOf(0, 3 * 86_400_000), "3d");

const started = runtime().modules(homeLayoutModule({})).start({ platform: "browser", scope: { workspaceId: "home-layout-checks" } });
const read = async () => {
	const answer = await started.send(homeLayout.arrangement.all);
	return answer.ok ? answer.output : null;
};

check("a fresh layout is empty", await read(), { setupIds: [], apps: [], hiddenApps: [] });
await started.send(homeLayout.arrangement.arrangeSetups, { setupIds: ["s2", "s1"] });
await started.send(homeLayout.arrangement.arrangeApps, { apps: [{ app: "git", span: 2 }], hiddenApps: ["files"] });
check("the module keeps the Setup order, the App order, sizes and removals", await read(), {
	setupIds: ["s2", "s1"],
	apps: [{ app: "git", span: 2 }],
	hiddenApps: ["files"],
});
await started.send(homeLayout.arrangement.arrangeSetups, { setupIds: ["s1"] });
check("arranging Setups leaves the Apps as they were", (await read())?.apps, [{ app: "git", span: 2 }]);
const refused = await started.send(homeLayout.arrangement.arrangeApps, { apps: [{ app: "git", span: 9 }], hiddenApps: [] });
check("a span past the widest is refused", refused.ok, false);

console.log(tally.failed ? `flows home: ${tally.failed} check(s) failed` : "flows home: all checks passed");
process.exit(tally.failed ? 1 : 0);
