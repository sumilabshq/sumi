import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import {
	CreateGroupCommand,
	HeldTabsQuery,
	PlaceTabCommand,
	RenameTabCommand,
	RestoreTabsCommand,
	ShowTabCommand,
	ShowViewCommand,
	ShownViewQuery,
	TearOffTabCommand,
} from "../packages/domain/app-host/generated/contract.ts";
import { MemoryStudioWindowGateway } from "../packages/domain/app-host/gateways/studio-window/memory.gateway.ts";
import { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
import { placedTabsOf } from "./places-fixture.ts";
import type { SeededTabs } from "./places-fixture.ts";
import { PaneTreeQuery, PlacePaneCommand } from "../packages/state/layout/generated/contract.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { HOST_CHAT, studioFakesOf } from "./app-host-fixture.ts";
import { WORKSPACE_LIST } from "../plugins/apps/data/places/shared/lib/tabs/tab-lists.ts";
import { givePage } from "../plugins/apps/data/places/shared/lib/tabs/host-tabs.ts";
import { momentOfWindow } from "../plugins/apps/data/places/shared/lib/tabs/kept-tabs.ts";
import { check, tally, thrownBy, waitFor } from "./check-helpers.ts";

const BROWSER_FIRST_PAGE = "tab-1";

const RESTORED = ["tab-10", "tab-12", "tab-15"];

function restoredTabs(): SeededTabs {
	return {
		tabs: RESTORED.map((id) => ({
			id,
			app: "browser",
			pageId: null,
			label: null,
			essentialId: null,
			lastAddress: null,
			lastTitle: null,
			lastFavicon: null,
		})),
		lists: {
			[WORKSPACE_LIST]: RESTORED.map((id) => ({
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

async function pageIdOf(studioApp: Runtime, tabId: string): Promise<string | null> {
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
		[true, true, [`open ${pageId}`, `tear off ${pageId} as tab-12`]],
	);
	const callsBefore = pages.calls.length;
	await studioApp.send(TearOffTabCommand, { id: "tab-12" });
	check(
		"a second drag keeps the page the tab was given and opens nothing new",
		[(await pageIdOf(studioApp, "tab-12")) === pageId, pages.calls.slice(callsBefore)],
		[true, [`tear off ${pageId} as tab-12`]],
	);
	const moment = momentOfWindow(placedTabsOf(restoredTabs()), "main", BUILT_IN_APPS);
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

function terminalTabs(): SeededTabs {
	return {
		...restoredTabs(),
		tabs: [
			...restoredTabs().tabs,
			{
				id: "tab-20",
				app: "terminal",
				pageId: null,
				label: null,
				essentialId: null,
				lastAddress: null,
				lastTitle: null,
				lastFavicon: null,
			},
		],
		lists: {
			[WORKSPACE_LIST]: [...RESTORED, "tab-20"].map((id) => ({
				kind: "tab",
				id,
			})),
		},
		minted: 20,
	};
}

async function pagelessTearOffChecks(): Promise<void> {
	const { pages, studioApp } = studioFakesOf({ tabs: terminalTabs(), pages: [BROWSER_FIRST_PAGE] });
	const torn = await studioApp.send(TearOffTabCommand, { id: "tab-20" });
	check(
		"a tab of an app with no page tears off through the same command: places opens a studio window holding the tab",
		[torn.ok, await pageIdOf(studioApp, "tab-20"), pages.calls.at(-1)],
		[true, null, "app window tab-20"],
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
		"a page no tab holds goes to no tab, so a tab never shows another tab's page",
		await pageIdOf(studioApp, "tab-10"),
		null,
	);
	await studioApp.send(ShowTabCommand, { id: "tab-12" });
	const shownPage = await pageIdOf(studioApp, "tab-12");
	check(
		"showing a restored tab with no page opens and shows a page of its own",
		[shownPage === BROWSER_FIRST_PAGE, pages.calls.slice(-2)],
		[false, [`open ${shownPage}`, `show ${shownPage}`]],
	);
	const board = await studioApp.send(PaneTreeQuery);
	const shownPane = board.ok
		? board.output.leaves.find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null)
		: undefined;
	await studioApp.send(PlacePaneCommand, {
		view: { kind: "app", tabId: "tab-15" },
		targetId: shownPane?.id ?? null,
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
		"renaming a tab places does not hold and grouping into a list no chat owns are refused by places",
		[renamed.ok ? null : renamed.reason, grouped.ok ? null : grouped.reason],
		[
			'places/rename-tab answered refused: the host holds no tab "tab-99"',
			'places/create-group answered refused: no tab list "chat-elsewhere" is here',
		],
	);
}

async function restartPageChecks(): Promise<void> {
	check(
		"restoring keeps the pages a start before gave its tabs where the host keeps pages across starts",
		await pagesAfterRestoreOf(true),
		RESTORED.map((id) => `page-${id}`),
	);
	check("restoring forgets them where the host's pages end with a start", await pagesAfterRestoreOf(false), [
		null,
		null,
		null,
	]);
}

function pagedTabs(): SeededTabs {
	return {
		...restoredTabs(),
		tabs: restoredTabs().tabs.map((tab) => ({ ...tab, pageId: `page-${tab.id}` })),
	};
}

async function pagesAfterRestoreOf(keepsPages: boolean): Promise<readonly (string | null)[]> {
	const places = new MemoryTabsGateway(placedTabsOf(pagedTabs(), [HOST_CHAT]));
	const studioWindow = new MemoryStudioWindowGateway({ label: "main", isBeside: false, keepsPages });
	const { studioApp } = studioFakesOf({ places, studioWindow, pages: [BROWSER_FIRST_PAGE] });
	await studioApp.send(RestoreTabsCommand);
	return (await places.placedTabs()).tabs.filter((tab) => tab.app !== "chat").map((tab) => tab.pageId);
}

async function viewChecks(): Promise<void> {
	const { studioApp } = studioFakesOf();
	await studioApp.send(ShowViewCommand, { view: "app" });
	const shown = await studioApp.send(ShownViewQuery);
	check("which app is shown is app-host's data", shown.ok && shown.output, "app");
}

const quiet = console.info;
console.info = () => undefined;
await tearOffChecks();
await pagelessTearOffChecks();
await ownWindowDropChecks();
await showAndPaneChecks();
await handlerRuleChecks();
await restartPageChecks();
await viewChecks();
console.info = quiet;
console.log(tally.failed === 0 ? "tab pages: all checks pass" : `tab pages: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
