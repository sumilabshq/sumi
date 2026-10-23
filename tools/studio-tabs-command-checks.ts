import { app } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { NO_STUDIO_HOST } from "../packages/core/src/engine/studio-host.ts";
import { AppHostClientModule } from "../packages/app-host/generated/module.ts";
import {
	AppTabsQuery,
	CloseOtherTabsCommand,
	OpenTabCommand,
	ShowTabCommand,
	CloseTabCommand,
	DuplicateTabCommand,
	OpenTabBelowCommand,
	ReloadTabCommand,
	RenameTabCommand,
	ReopenClosedTabCommand,
} from "../packages/app-host/features/tabs/contract.ts";
import { AppTabsGateway } from "../packages/app-host/gateways/app-tabs/app-tabs.gateway.ts";
import { StudioHostAppsGateway } from "../packages/app-host/gateways/host-apps/studio-host.gateway.ts";
import { PageFactsGateway } from "../packages/app-host/gateways/page-facts/page-facts.gateway.ts";
import { TabsColumnGateway } from "../packages/app-host/gateways/tabs-column/tabs-column.gateway.ts";
import { CLOSED_KEPT, HostTabs } from "../packages/app-host/shared/lib/host-tabs/host-tabs.ts";
import { COLUMN_OPENED_ON } from "../packages/app-host/shared/lib/tabs-column/column-look.ts";
import { TabsColumnStore } from "../packages/app-host/shared/lib/tabs-column/tabs-column-store.ts";
import type { AppKind, AppTabState } from "../packages/app-host/shared/schema/app-tab.schema.ts";
import type { KeptColumn } from "../packages/app-host/shared/schema/tabs-column.schema.ts";
import type { PageFacts } from "../packages/app-host/shared/schema/page-facts.schema.ts";

export async function checksTabCommands(check: Check): Promise<void> {
	await checksTabsParse(check);
	await checksDuplicate(check);
	await checksNewTabBelow(check);
	await checksRename(check);
	await checksCloseAndReopen(check);
	await checksClosedKept(check);
	await checksReload(check);
	await checksManyPages(check);
}

type Check = (what: string, isOk: boolean, got: unknown) => void;

const SITE = "https://example.com/board";

class ShownAppGateway extends AppTabsGateway {
	private shown: AppKind | null = "canvas";

	shownApp(): AppKind | null {
		return this.shown;
	}

	watch(): () => void {
		return () => undefined;
	}

	show(app: AppKind): void {
		this.shown = app;
	}

	closePanel(): void {
		this.shown = null;
	}
}

function pageAt(pageId: string, url: string): PageFacts {
	return {
		pageId,
		title: url === "" ? "" : "Board",
		url,
		favicon: null,
		isInkReading: false,
		isAskWaiting: false,
		isClosedToInk: false,
	};
}

class ManyPagesGateway extends PageFactsGateway {
	readonly opened: string[] = [];
	readonly reloaded: string[] = [];
	readonly closed: string[] = [];
	shown: string | null = null;
	private facts: readonly PageFacts[] = [pageAt("page-1", SITE)];

	isAvailable(): boolean {
		return true;
	}

	pages(): readonly PageFacts[] {
		return this.facts;
	}

	watch(): () => void {
		return () => undefined;
	}

	openPage(pageId: string): void {
		if (this.facts.some((page) => page.pageId === pageId)) {
			return;
		}

		this.facts = [...this.facts, pageAt(pageId, "")];
	}

	closePage(pageId: string): void {
		this.closed.push(pageId);
		this.facts = this.facts.filter((page) => page.pageId !== pageId);
	}

	showPage(pageId: string): void {
		this.shown = pageId;
	}

	openAddress(pageId: string, address: string): void {
		this.opened.push(`${pageId} ${address}`);
		this.facts = this.facts.map((page) => (page.pageId === pageId ? pageAt(pageId, address) : page));
	}

	reloadPage(pageId: string): void {
		this.reloaded.push(pageId);
	}

	stop(): void {}
}

class NoKeptColumnGateway extends TabsColumnGateway {
	kept(): KeptColumn | null {
		return null;
	}

	keep(): void {}
}

interface Started {
	readonly host: StartedApp;
	readonly pages: ManyPagesGateway;
}

function started(): Started {
	const pages = new ManyPagesGateway();
	const hostTabs = new HostTabs([
		{
			app: "canvas",
			pageId: null,
			isPinned: true,
		},
		{
			app: "browser",
			pageId: "page-1",
			isPinned: false,
		},
		{
			app: "canvas",
			pageId: null,
			isPinned: false,
		},
	]);
	const host = app({
		modules: [
			AppHostClientModule.with({
				appTabsGateway: new ShownAppGateway(),
				pageFactsGateway: pages,
				hostAppsGateway: new StudioHostAppsGateway(NO_STUDIO_HOST),
				tabsColumnGateway: new NoKeptColumnGateway(),
				hostTabs,
				tabsColumnStore: new TabsColumnStore(COLUMN_OPENED_ON),
			}),
		],
	});
	return { host, pages };
}

async function tabsOf(host: StartedApp): Promise<readonly AppTabState[]> {
	const answer = await host.send(AppTabsQuery);
	return answer.ok ? answer.output.tabs : [];
}

async function idsOf(host: StartedApp): Promise<readonly string[]> {
	return (await tabsOf(host)).map((tab) => tab.id);
}

async function checksDuplicate(check: Check): Promise<void> {
	const { host, pages } = started();
	await host.send(DuplicateTabCommand, { id: "tab-2" });
	const tabs = await tabsOf(host);
	const copy = tabs[2];
	const copyPage = pages.pages().at(-1)?.pageId ?? "";
	check(
		"Duplicate tab opens a new page right after the tab, at the same address, and shows it",
		copy?.app === "browser" &&
			tabs[1]?.id === "tab-2" &&
			pages.pages().length === 2 &&
			pages.opened.join() === `${copyPage} ${SITE}` &&
			pages.shown === copyPage,
		{ order: tabs.map((tab) => `${tab.id}:${tab.app}`), opened: pages.opened, shown: pages.shown },
	);
	await host.send(DuplicateTabCommand, { id: "tab-3" });
	const canvas = await tabsOf(host);
	check(
		"Duplicate tab on a canvas opens another canvas right after it",
		canvas[canvas.findIndex((tab) => tab.id === "tab-3") + 1]?.app === "canvas" && canvas.length === tabs.length + 1,
		canvas.map((tab) => `${tab.id}:${tab.app}`),
	);
}

async function checksNewTabBelow(check: Check): Promise<void> {
	const { host, pages } = started();
	const before = await idsOf(host);
	await host.send(OpenTabBelowCommand, { id: "tab-1" });
	await host.send(OpenTabBelowCommand, { id: "tab-1" });
	const after = await tabsOf(host);
	check(
		"New tab below opens a browser tab on a new page at the next index, in the pressed tab's group, every time",
		after[1]?.app === "browser" &&
			after[1]?.isPinned === true &&
			!before.includes(after[1]?.id ?? "tab-1") &&
			after[1]?.title === "New tab" &&
			pages.pages().length === 3,
		after.map((tab) => `${tab.id}:${tab.app}${tab.isPinned ? "*" : ""}:${tab.title}`),
	);
}

async function checksRename(check: Check): Promise<void> {
	const { host } = started();
	await host.send(RenameTabCommand, { id: "tab-2", label: "  Sprint board  " });
	const renamed = (await tabsOf(host)).find((tab) => tab.id === "tab-2");
	check(
		"Rename saves a trimmed label as the title, and the site becomes the subtitle",
		renamed?.title === "Sprint board" && renamed.subtitle === "example.com" && renamed.label === "Sprint board",
		renamed,
	);
	await host.send(RenameTabCommand, { id: "tab-2", label: "   " });
	const cleared = (await tabsOf(host)).find((tab) => tab.id === "tab-2");
	check("an empty label clears the rename", cleared?.title === "Board" && cleared.label === null, cleared);
}

async function checksCloseAndReopen(check: Check): Promise<void> {
	const { host } = started();
	await host.send(DuplicateTabCommand, { id: "tab-3" });
	const before = await idsOf(host);
	await host.send(CloseOtherTabsCommand, { id: "tab-3" });
	const kept = await idsOf(host);
	check("Close other tabs keeps the pinned tabs and the pressed one", kept.join() === "tab-1,tab-3", kept);
	await host.send(ReopenClosedTabCommand);
	await host.send(ReopenClosedTabCommand);
	const reopened = await idsOf(host);
	check("Reopen closed tab restores the last closed tabs where they stood", reopened.join() === before.join(), {
		before,
		reopened,
	});
	await host.send(CloseTabCommand, { id: "tab-2" });
	await host.send(ReopenClosedTabCommand);
	const restored = await tabsOf(host);
	check(
		"a reopened browser tab gets its page back",
		restored.find((tab) => tab.id === "tab-2")?.title === "Board",
		restored.map((tab) => `${tab.id}:${tab.title}`),
	);
}

async function checksClosedKept(check: Check): Promise<void> {
	const hostTabs = new HostTabs([]);
	const opened = Array.from({ length: CLOSED_KEPT + 5 }, () =>
		hostTabs.open({
			app: "canvas",
			pageId: null,
			isPinned: false,
		}),
	);
	opened.forEach((tab) => hostTabs.close(tab.id, null));
	const { closed } = hostTabs.now();
	check(
		`the closed-tabs stack keeps the last ${CLOSED_KEPT}`,
		closed.length === CLOSED_KEPT && closed.at(-1)?.tab.id === opened.at(-1)?.id,
		closed.length,
	);
}

async function checksReload(check: Check): Promise<void> {
	const { host, pages } = started();
	const browser = await host.send(ReloadTabCommand, { id: "tab-2" });
	const canvas = await host.send(ReloadTabCommand, { id: "tab-3" });
	check(
		"Reload tab reloads the browser tab's page and refuses a canvas",
		browser.ok && !canvas.ok && pages.reloaded.join() === "page-1",
		{ browser: browser.ok, canvas: canvas.ok, reloaded: pages.reloaded },
	);
}

async function checksTabsParse(check: Check): Promise<void> {
	const { host } = started();
	const fresh = await host.send(AppTabsQuery);
	await host.send(CloseTabCommand, { id: "tab-3" });
	const closed = await host.send(AppTabsQuery);
	check(
		"AppTabsQuery's output parses with an empty closed stack and with one closed tab",
		fresh.ok && !fresh.output.canReopen && closed.ok && closed.output.canReopen,
		{
			fresh: fresh.ok ? fresh.output.canReopen : fresh.reason,
			closed: closed.ok ? closed.output.canReopen : closed.reason,
		},
	);
}

async function checksManyPages(check: Check): Promise<void> {
	const { host, pages } = started();
	await host.send(OpenTabCommand, { app: "browser" });
	await host.send(OpenTabCommand, { app: "browser" });
	await host.send(OpenTabCommand, { app: "browser" });
	const opened = await tabsOf(host);
	const browserTabs = opened.filter((tab) => tab.app === "browser");
	check(
		"New tab opens as many browser tabs as asked, each on its own page in the new-tab state",
		browserTabs.length === 4 &&
			pages.pages().length === 4 &&
			browserTabs.slice(1).every((tab) => tab.title === "New tab"),
		{ tabs: browserTabs.map((tab) => tab.title), pages: pages.pages().map((page) => page.pageId) },
	);
	await host.send(ShowTabCommand, { id: "tab-2" });
	check("showing a tab shows its own page", pages.shown === "page-1", pages.shown);
	const third = browserTabs[2]?.id ?? "";
	const thirdPage = pages.pages()[2]?.pageId ?? "";
	await host.send(CloseTabCommand, { id: third });
	check(
		"closing a browser tab closes its page and keeps the others",
		pages.closed.join() === thirdPage && pages.pages().length === 3,
		{ closed: pages.closed, pages: pages.pages().length },
	);
	await host.send(CloseTabCommand, { id: "tab-2" });
	await host.send(ReopenClosedTabCommand);
	const reopened = (await tabsOf(host)).find((tab) => tab.id === "tab-2");
	check(
		"Reopen closed tab opens a page again at its last address",
		reopened?.address === SITE && pages.opened.includes(`page-1 ${SITE}`) && pages.shown === "page-1",
		{ reopened, opened: pages.opened },
	);
}
