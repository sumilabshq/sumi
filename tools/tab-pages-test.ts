import {
	CreateGroupCommand,
	HeldTabsQuery,
	PlaceTabCommand,
	RenameTabCommand,
	ResetColumnCommand,
	ResizeColumnCommand,
	RestoreTabsCommand,
	ShowTabCommand,
	ShowViewCommand,
	ShownViewQuery,
	TabsColumnQuery,
	TearOffTabCommand,
} from "../packages/domain/app-host/generated/contract.ts";
import { givePage, momentOfKept } from "../packages/domain/app-host/shared/lib/host-tabs/host-tabs.ts";
import type { KeptTabs } from "../packages/domain/app-host/shared/schema/tabs-session.schema.ts";
import { MemoryHostTabsGateway } from "../packages/domain/app-host/gateways/host-tabs/memory.gateway.ts";
import type { HostTabsGateway } from "../packages/domain/app-host/gateways/host-tabs/host-tabs.gateway.ts";
import { PlacePaneCommand } from "../packages/state/layout/generated/contract.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { check, tally, thrownBy, waitFor } from "./check-helpers.ts";

const BROWSER_FIRST_PAGE = "tab-1";

class StartEndingHostTabsGateway extends MemoryHostTabsGateway {
	override keepsPagesAcrossStarts(): boolean {
		return false;
	}
}
const RESTORED = ["tab-10", "tab-12", "tab-15"];

function restoredTabs(): KeptTabs {
	return {
		tabs: RESTORED.map((id) => ({
			id,
			app: "browser",
			pageId: null,
			label: null,
			essentialId: null,
		})),
		lists: {
			[HOST_CHAT]: RESTORED.map((id) => ({
				kind: "tab",
				id,
			})),
		},
		groups: [],
		shownId: "tab-10",
		lastShown: {},
		minted: 15,
		closed: [],
	};
}

function restoredStudio() {
	return studioFakesOf({ tabs: restoredTabs(), pages: [BROWSER_FIRST_PAGE] });
}

async function pageIdOf(studioApp: StartedApp, tabId: string): Promise<string | null> {
	const held = await studioApp.send(HeldTabsQuery);
	return held.ok ? (held.output.tabs.find((tab) => tab.id === tabId)?.pageId ?? null) : null;
}

async function tearOffChecks(): Promise<void> {
	const { pages, studioApp } = restoredStudio();
	const torn = await studioApp.send(TearOffTabCommand, { id: "tab-12" });
	const pageId = await pageIdOf(studioApp, "tab-12");
	check(
		"a restored tab with no page is given one before the host is asked to tear it off",
		[torn.ok, pageId?.startsWith("page-"), pages.calls.slice(-2)],
		[true, true, [`open ${pageId}`, `tear off ${pageId}`]],
	);
	const callsBefore = pages.calls.length;
	await studioApp.send(TearOffTabCommand, { id: "tab-12" });
	check(
		"a second drag keeps the page the tab was given and opens nothing new",
		[(await pageIdOf(studioApp, "tab-12")) === pageId, pages.calls.slice(callsBefore)],
		[true, [`tear off ${pageId}`]],
	);
	const moment = momentOfKept(restoredTabs(), HOST_CHAT);
	const given = givePage(moment, { id: "tab-12", pageId: "page-mine", why: "test" })?.moment ?? moment;
	check(
		"no tab takes a page another tab holds, and no tab trades its page",
		[
			thrownBy(() => givePage(given, { id: "tab-15", pageId: "page-mine", why: "test" })) !== "",
			thrownBy(() => givePage(given, { id: "tab-12", pageId: "page-other", why: "test" })) !== "",
		],
		[true, true],
	);
}

async function ownWindowDropChecks(): Promise<void> {
	const { pages, studioApp } = restoredStudio();
	const placed = await studioApp.send(PlaceTabCommand, { id: "tab-15", to: { kind: "own-window" } });
	const pageId = await pageIdOf(studioApp, "tab-15");
	check(
		"a restored tab dropped outside the studio opens its page, then its own window",
		[placed.ok, pages.calls.slice(-2)],
		[true, [`open ${pageId}`, `own window ${pageId}`]],
	);
}

async function showAndPaneChecks(): Promise<void> {
	const { pages, studioApp } = restoredStudio();
	check(
		"the browser's first page goes to the first restored tab",
		await pageIdOf(studioApp, "tab-10"),
		BROWSER_FIRST_PAGE,
	);
	await studioApp.send(ShowTabCommand, { id: "tab-12" });
	const shownPage = await pageIdOf(studioApp, "tab-12");
	check(
		"showing a restored tab with no page opens and shows a page of its own",
		[shownPage === BROWSER_FIRST_PAGE, pages.calls.slice(-2)],
		[false, [`open ${shownPage}`, `show ${shownPage}`]],
	);
	await studioApp.send(PlacePaneCommand, {
		view: { kind: "app", tabId: "tab-15" },
		targetId: "pane-app",
		side: "right",
	});
	const isGiven = await waitFor(() =>
		pages.calls.some((call) => call.startsWith("open page-") && call !== `open ${shownPage}`),
	);
	const panePage = await pageIdOf(studioApp, "tab-15");
	check(
		"a restored tab placed in a pane gets a page the pane can draw, through the panes subscriber",
		[isGiven, panePage === null, pages.calls.at(-1)],
		[true, false, `open ${panePage}`],
	);
}

async function handlerRuleChecks(): Promise<void> {
	const { studioApp } = restoredStudio();
	const renamed = await studioApp.send(RenameTabCommand, { id: "tab-99", label: "Gone" });
	const grouped = await studioApp.send(CreateGroupCommand, { list: "chat-elsewhere" });
	check(
		"renaming a tab the host does not hold and grouping into a list not on screen are refused by their handlers",
		[renamed.ok ? null : renamed.reason, grouped.ok ? null : grouped.reason],
		['the host holds no tab "tab-99"', 'no tab list "chat-elsewhere" is on screen'],
	);
}

async function restartPageChecks(): Promise<void> {
	check(
		"restoring keeps the pages a start before gave its tabs where the host keeps pages across starts",
		await pagesAfterRestoreOf(new MemoryHostTabsGateway(pagedTabs())),
		RESTORED.map((id) => `page-${id}`),
	);
	check(
		"restoring forgets them where the host's pages end with a start",
		await pagesAfterRestoreOf(new StartEndingHostTabsGateway(pagedTabs())),
		[null, null, null],
	);
}

function pagedTabs(): KeptTabs {
	return {
		...restoredTabs(),
		tabs: restoredTabs().tabs.map((tab) => ({ ...tab, pageId: `page-${tab.id}` })),
	};
}

async function pagesAfterRestoreOf(hostTabs: HostTabsGateway): Promise<readonly (string | null)[] | undefined> {
	const { studioApp } = studioFakesOf({ hostTabs, pages: [BROWSER_FIRST_PAGE] });
	await studioApp.send(RestoreTabsCommand);
	return hostTabs.tabs()?.tabs.map((tab) => tab.pageId);
}

async function viewAndColumnChecks(): Promise<void> {
	const { studioApp } = studioFakesOf();
	await studioApp.send(ShowViewCommand, { view: "app" });
	const shown = await studioApp.send(ShownViewQuery);
	await studioApp.send(ResizeColumnCommand, { px: 9999 });
	const widest = await studioApp.send(TabsColumnQuery);
	await studioApp.send(ResetColumnCommand);
	const reset = await studioApp.send(TabsColumnQuery);
	check(
		"which app is shown is app-host's data, and the column is held between its bounds and reset to its usual width",
		[shown.ok && shown.output, widest.ok && widest.output.widthPx, reset.ok && reset.output.widthPx],
		["app", 420, 240],
	);
}

const quiet = console.info;
console.info = () => undefined;
await tearOffChecks();
await ownWindowDropChecks();
await showAndPaneChecks();
await handlerRuleChecks();
await restartPageChecks();
await viewAndColumnChecks();
console.info = quiet;
console.log(tally.failed === 0 ? "tab pages: all checks pass" : `tab pages: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
