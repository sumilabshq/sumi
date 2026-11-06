import { app, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { server } from "../packages/shared/data-framework/src/server/index.ts";
import {
	AppTabQuery,
	AskedLinksQuery,
	GoBackInTabCommand,
	GoForwardInTabCommand,
	OpenLinkCommand,
	PlacesModule,
	RecordAppPageCommand,
	TakeAskedLinkCommand,
} from "../packages/state/places/index.ts";
import { PlacesModule as RunnablePlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";
import { placedTabsOf } from "./places-fixture.ts";

const tabs = new MemoryTabsGateway(
	placedTabsOf({
		tabs: [
			{ id: "t1", app: "tasks", pageId: null, label: null, lastAddress: "" },
			{ id: "n1", app: "notes", pageId: null, label: null, lastAddress: "" },
		],
		shownId: "t1",
		minted: 2,
		closed: [],
	}),
);
const served = server()
	.modules(RunnablePlacesModule.with({ windows: new MemoryWindowsGateway({ windows: [] }), tabs }))
	.start({ env: {}, host: { authenticate: new AppCallerAuthenticate() } });

function placesAs(id: string | null): StartedApp {
	const headers = (): Record<string, string> => (id === null ? {} : { [APP_CALLER_HEADER]: id });
	return app()
		.imports(PlacesModule.over(orpcTransport("http://places.test", { fetch: served.fetch, headers })))
		.start();
}

const tasks = placesAs("tasks");
const studio = placesAs(null);

async function tabOf(): Promise<unknown> {
	const answer = await studio.send(AppTabQuery, { id: "t1" });
	return answer.ok ? [answer.output.address, answer.output.canGoBack, answer.output.canGoForward] : answer.reason;
}

async function historyChecks(): Promise<void> {
	await tasks.send(RecordAppPageCommand, { id: "t1", address: "T-1", how: "push", title: "T-1" });
	await tasks.send(RecordAppPageCommand, { id: "t1", address: "T-1?view=list", how: "replace" });
	check("a push makes a step back; a replace makes none", await tabOf(), ["T-1?view=list", true, false]);
	await studio.send(GoBackInTabCommand, { id: "t1" });
	check("back returns to the board and offers forward", await tabOf(), ["", false, true]);
	const nowhere = await studio.send(GoBackInTabCommand, { id: "t1" });
	check(
		"back with nothing behind is refused",
		nowhere.ok ? "went" : nowhere.reason,
		'the tab "t1" has nothing to go back to',
	);
	await studio.send(GoForwardInTabCommand, { id: "t1" });
	check("forward returns to the task", await tabOf(), ["T-1?view=list", true, false]);
	const byApp = await tasks.send(GoBackInTabCommand, { id: "t1" });
	check("an app cannot step the shell's history itself", byApp.ok, false);
}

async function linkChecks(): Promise<void> {
	const same = await tasks.send(OpenLinkCommand, { from: "t1", href: "/T-2", inNewTab: false });
	check(
		"a /<page> link navigates the same tab and pushes",
		[same.ok ? same.output.kind : same.reason, await tabOf()],
		["navigated", ["T-2", true, false]],
	);
	const deep = await tasks.send(OpenLinkCommand, { from: "t1", href: "sumi://tasks/T-3", inNewTab: false });
	check(
		"a sumi:// link to the same app navigates the same tab",
		[deep.ok ? deep.output.kind : deep.reason, await tabOf()],
		["navigated", ["T-3", true, false]],
	);
	await tasks.send(OpenLinkCommand, { from: "t1", href: "/T-4", inNewTab: true });
	await tasks.send(OpenLinkCommand, { from: "t1", href: "https://example.com/a", inNewTab: false });
	await tasks.send(OpenLinkCommand, { from: "t1", href: "sumi://chat/c-1", inNewTab: false });
	const asked = await studio.send(AskedLinksQuery, { tabIds: ["t1"] });
	check(
		"a new-tab, web or other-app link is asked of the studio, the same-app one as sumi://",
		asked.ok ? asked.output.links.map(({ href, inNewTab }) => [href, inNewTab]) : asked.reason,
		[
			["sumi://tasks/T-4", true],
			["https://example.com/a", false],
			["sumi://chat/c-1", false],
		],
	);
	const other = await studio.send(AskedLinksQuery, { tabIds: ["n1"] });
	check("a window reads only the links asked from its own tabs", other.ok ? other.output.links : other.reason, []);
	const first = asked.ok ? (asked.output.links[0]?.id ?? "") : "";
	const taken = await studio.send(TakeAskedLinkCommand, { id: first });
	const again = await studio.send(TakeAskedLinkCommand, { id: first });
	check("an asked link is taken once", [taken.ok, again.ok], [true, false]);
	const refused = await tasks.send(OpenLinkCommand, { from: "t1", href: "javascript:alert(1)", inNewTab: false });
	check("a link of another scheme is refused", refused.ok, false);
	const foreign = await tasks.send(OpenLinkCommand, { from: "n1", href: "/x", inNewTab: false });
	check("an app cannot follow a link from a tab it does not hold", foreign.ok, false);
	const asApp = await tasks.send(AskedLinksQuery, { tabIds: ["t1"] });
	check("an app cannot read the asked links", asApp.ok, false);
}

console.info = () => undefined;
await historyChecks();
await linkChecks();
console.log(
	tally.failed ? `places navigation: ${tally.failed} check(s) failed` : "places navigation: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
