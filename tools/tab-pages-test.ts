import { studioAppHostParts } from "../packages/app-host/gateways/app-host-parts/studio.gateway.ts";
import { PageFactsGateway } from "../packages/app-host/gateways/page-facts/page-facts.gateway.ts";
import { PaneTabsGateway } from "../packages/app-host/gateways/pane-tabs/pane-tabs.gateway.ts";
import { TabsSessionGateway } from "../packages/app-host/gateways/tabs-session/tabs-session.gateway.ts";
import { PlaceTabCommand, ShowTabCommand, WatchTabTearOffCommand } from "../packages/app-host/generated/index.ts";
import { AppHostClientModule } from "../packages/app-host/generated/module.ts";
import type { KeptTabs } from "../packages/app-host/shared/schema/tabs-session.schema.ts";
import type { PageFacts } from "../packages/app-host/shared/schema/page-facts.schema.ts";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.ts";
import { app } from "../packages/core/src/requests/index.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const BROWSER_FIRST_PAGE = "tab-1";
const CHAT = "chat-1";

class RecordedPages extends PageFactsGateway {
	readonly calls: string[] = [];
	private held: readonly string[] = [BROWSER_FIRST_PAGE];

	isAvailable(): boolean {
		return true;
	}

	canOpenOwnWindow(): boolean {
		return true;
	}

	pages(): readonly PageFacts[] {
		return this.held.map((pageId) => factsOf(pageId));
	}

	openPage(pageId: string): void {
		this.calls.push(`open ${pageId}`);
		this.held = [...this.held, pageId];
	}

	showPage(pageId: string): void {
		this.calls.push(`show ${pageId}`);
	}

	watchTearOff(pageId: string): void {
		this.calls.push(`watch ${pageId}`);
	}

	openPageInOwnWindow(pageId: string): void {
		this.calls.push(`own window ${pageId}`);
	}

	watch(): () => void {
		return () => undefined;
	}

	closePage(): void {}

	openAddress(): void {}

	reloadPage(): void {}

	focusPageWindow(): void {}

	stopTearOff(): void {}

	stop(): void {}
}

class RestoredSession extends TabsSessionGateway {
	kept(): KeptTabs {
		return {
			tabs: ["tab-10", "tab-12", "tab-15"].map((id) => ({
				id,
				app: "browser",
				pageId: null,
				label: null,
				essentialId: null,
			})),
			lists: {
				[CHAT]: ["tab-10", "tab-12", "tab-15"].map((id) => ({
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

	keep(): void {}
}

class PlacedPanes extends PaneTabsGateway {
	private paned: readonly string[] = [];
	private readonly watchers = new Set<() => void>();

	place(tabId: string): void {
		this.paned = [tabId];
		this.watchers.forEach((changed) => changed());
	}

	tabIdsInPanes(): readonly string[] {
		return this.paned;
	}

	reveal(): void {}

	closePanesOf(): void {}

	openShownTabPane(): void {}

	closeShownTabPane(): void {}

	showInTargetPane(): boolean {
		return false;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => this.watchers.delete(changed);
	}
}

function factsOf(pageId: string): PageFacts {
	return {
		pageId,
		title: "",
		url: "",
		favicon: null,
		isInkReading: false,
		isAskWaiting: false,
		isClosedToInk: false,
		isInOwnWindow: false,
	};
}

function restoredStudio() {
	const pages = new RecordedPages();
	const panes = new PlacedPanes();
	const parts = studioAppHostParts({
		studioState: createStudioState(),
		workspace: "workspace-1",
		pageFactsGateway: pages,
		tabsSessionGateway: new RestoredSession(),
		paneTabsGateway: panes,
		activeChat: {
			now: () => ({
				id: CHAT,
				title: "Chat",
			}),
			watch: () => () => undefined,
		},
	});
	return {
		pages,
		panes,
		parts,
		host: app({ modules: [AppHostClientModule.with(parts)] }),
	};
}

async function tearOffChecks(): Promise<void> {
	const { pages, parts, host } = restoredStudio();
	const watched = await host.send(WatchTabTearOffCommand, { id: "tab-12" });
	const pageId = parts.tabPageIdOf("tab-12");
	check(
		"a restored tab with no page is given one before its tear-off is watched",
		[watched.ok, pageId?.startsWith("page-"), pages.calls.slice(-2)],
		[true, true, [`open ${pageId}`, `watch ${pageId}`]],
	);
	const callsBefore = pages.calls.length;
	await host.send(WatchTabTearOffCommand, { id: "tab-12" });
	check(
		"a second lift keeps the page the tab was given and opens nothing new",
		[pageId !== null, parts.tabPageIdOf("tab-12") === pageId, pages.calls.slice(callsBefore)],
		[true, true, [`watch ${pageId}`]],
	);
	check(
		"no tab takes a page another tab holds, and no tab trades its page",
		[
			thrownBy(() => parts.hostTabs.givePage("tab-15", pageId ?? "", "test")) !== "",
			thrownBy(() => parts.hostTabs.givePage("tab-12", "page-other", "test")) !== "",
		],
		[true, true],
	);
}

async function ownWindowDropChecks(): Promise<void> {
	const { pages, parts, host } = restoredStudio();
	const placed = await host.send(PlaceTabCommand, { id: "tab-15", to: { kind: "own-window" } });
	const pageId = parts.tabPageIdOf("tab-15");
	check(
		"a restored tab dropped outside the studio opens its page, then its own window",
		[placed.ok, pages.calls.slice(-2)],
		[true, [`open ${pageId}`, `own window ${pageId}`]],
	);
}

async function showAndPaneChecks(): Promise<void> {
	const { pages, panes, parts, host } = restoredStudio();
	check("the browser's first page goes to the first restored tab", parts.tabPageIdOf("tab-10"), BROWSER_FIRST_PAGE);
	await host.send(ShowTabCommand, { id: "tab-12" });
	const shownPage = parts.tabPageIdOf("tab-12");
	check(
		"showing a restored tab with no page opens and shows a page of its own",
		[shownPage === BROWSER_FIRST_PAGE, pages.calls.slice(-2)],
		[false, [`open ${shownPage}`, `show ${shownPage}`]],
	);
	panes.place("tab-15");
	const panePage = parts.tabPageIdOf("tab-15");
	check(
		"a restored tab placed in a pane gets a page the pane can draw",
		[panePage === null, pages.calls.at(-1)],
		[false, `open ${panePage}`],
	);
}

const quiet = console.info;
console.info = () => undefined;
await tearOffChecks();
await ownWindowDropChecks();
await showAndPaneChecks();
console.info = quiet;
console.log(tally.failed === 0 ? "tab pages: all checks pass" : `tab pages: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
