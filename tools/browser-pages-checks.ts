import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Answer, Runtime } from "../packages/shared/data-framework/src/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { ReadPageContentCommand } from "../packages/domain/browser/index.ts";
import {
	BrowserTabsQuery,
	ClosePageCommand,
	OpenPageCommand,
	ShowTabCommand,
} from "../packages/domain/browser/index.ts";
import { onceAllowanceOf } from "../packages/domain/browser/shared/lib/once-grants.ts";
import type { BrowserTab } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import type { CommittedPage } from "../packages/domain/browser/shared/schema/page-read.schema.ts";
import { check, waitFor } from "./check-helpers.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import type { FakeBrowser } from "./browser-fakes.ts";
import { checksElectronPages } from "./browser-electron-pages-checks.ts";

const FIRST = "tab-1";
const PRIVATE_SITE = "https://192.168.1.10/board";

class ManyPagesGateway extends FakeBrowserPagesGateway {
	shown: string | null = FIRST;
	held: readonly BrowserTab[] = [this.tab];

	override tabs(): readonly BrowserTab[] {
		return this.held;
	}

	override shownId(): string | null {
		return this.shown;
	}

	override isOnScreen(tabId: string): boolean {
		return this.isShownOnScreen && tabId === this.shown;
	}

	override create(tabId: string): void {
		if (this.held.some(({ id }) => id === tabId)) {
			return;
		}

		this.held = [
			...this.held,
			{
				...this.tab,
				id: tabId,
				url: "",
				title: "New tab",
			},
		];
		this.told();
	}

	override close(tabId: string): void {
		this.held = this.held.filter(({ id }) => id !== tabId);
		this.shown = this.shown === tabId ? null : this.shown;
		this.told();
	}

	override show(tabId: string): void {
		this.shown = tabId;
		this.told();
	}

	override open(tabId: string, url: string): void {
		this.held = this.held.map((tab) =>
			tab.id === tabId
				? {
						...tab,
						url,
					}
				: tab,
		);
		this.told();
	}

	override committed(tabId: string): CommittedPage | null {
		const tab = this.held.find(({ id }) => id === tabId);
		return tab
			? {
					url: tab.url,
					entry: this.entry,
				}
			: null;
	}
}

interface ManyPages {
	readonly browser: FakeBrowser;
	readonly pages: ManyPagesGateway;
	readonly started: Runtime;
}

function manyPages(): ManyPages {
	const pages = new ManyPagesGateway();
	const browser = fakeBrowser(pages);
	return {
		browser,
		pages,
		started: runtime().modules(BrowserModule({ injects: browser.parts })).start(),
	};
}

function said(answer: Answer<unknown>): string {
	return answer.ok ? "ok" : answer.reason;
}

async function opened(started: Runtime, tabIds: readonly string[]): Promise<void> {
	for (const tabId of tabIds) {
		await started.send(OpenPageCommand, { tabId });
	}
}

const listed = manyPages();
await opened(listed.started, ["page-b", "page-c", "page-b"]);
await listed.started.send(ShowTabCommand, { tabId: "page-c" });
const listedTabs = await listed.started.send(BrowserTabsQuery, { heldTabId: null });
check(
	"the browser holds one page per opened tab, an id opened twice once, and shows the one asked",
	listedTabs.ok && listedTabs.output.tabs.map((tab) => `${tab.id}${tab.isShown ? "*" : ""}`),
	[FIRST, "page-b", "page-c*"],
);
check("showing a page freezes every other page and thaws it", [...listed.pages.frozen].sort(), ["page-b", FIRST]);
await listed.started.send(ShowTabCommand, { tabId: FIRST });
check("showing another page thaws it and freezes the one left", [...listed.pages.frozen].sort(), ["page-b", "page-c"]);
await listed.started.send(ClosePageCommand, { tabId: "page-c" });
const afterClose = await listed.started.send(BrowserTabsQuery, { heldTabId: null });
check(
	"closing a page takes it off the list and keeps the rest",
	afterClose.ok && afterClose.output.tabs.map((tab) => tab.id),
	[FIRST, "page-b"],
);

const switching = manyPages();
await opened(switching.started, ["page-b"]);
switching.pages.duringRead = () => void switching.pages.show("page-b");
check(
	"a page switched away from during Sumi's read is refused as not visible",
	said(await switching.started.send(ReadPageContentCommand, { tabId: null })),
	"tab-not-visible",
);
check("and the audit names the page that was being read", switching.browser.audit.access.at(-1)?.tab, FIRST);
check("a hidden page answers that it is not on screen", switching.pages.isOnScreen(FIRST), false);

const reading = manyPages();
await opened(reading.started, ["page-b"]);
reading.pages.open("page-b", "https://example.com/board");
await reading.started.send(ShowTabCommand, { tabId: "page-b" });
check("Sumi reads the shown page", said(await reading.started.send(ReadPageContentCommand, { tabId: null })), "ok");
check("and the reading mark is on that page", reading.browser.parts.inkActivity.inkActivity().reading?.tabId, "page-b");

const granted = manyPages();
await opened(granted.started, ["page-b"]);
granted.pages.open(FIRST, PRIVATE_SITE);
granted.pages.open("page-b", PRIVATE_SITE);
granted.browser.parts.onceAllowances.saveOnceAllowances([onceAllowanceOf("192.168.1.10", FIRST, Date.now())]);
const grantedTabs = await granted.started.send(BrowserTabsQuery, { heldTabId: null });
check(
	"a once-grant on one page does not cover another page at the same site",
	grantedTabs.ok && grantedTabs.output.tabs.map((tab) => `${tab.id}:${tab.access?.decision}`),
	[`${FIRST}:allow`, "page-b:ask"],
);

const asking = manyPages();
asking.pages.open(FIRST, PRIVATE_SITE);
const askedRead = asking.started.send(ReadPageContentCommand, { tabId: null });
await waitFor(() => asking.browser.parts.accessAsks.accessAsks().length === 1);
await asking.started.send(ClosePageCommand, { tabId: FIRST });
check("closing a page refuses the ask still waiting on it", said(await askedRead), "ask-unanswered");

await checksElectronPages();
