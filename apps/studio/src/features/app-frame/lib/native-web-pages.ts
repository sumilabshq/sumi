import {
	AttachPagesCommand,
	BrowserTabsQuery,
	ClosePageCommand,
	DetachPagesCommand,
	GoBackCommand,
	GoForwardCommand,
	OpenAddressCommand,
	OpenPageCommand,
	ReloadPageCommand,
} from "@widgetarium/browser";
import type { BrowserTabs } from "@widgetarium/browser";
import type { Answer, StartedApp } from "@widgetarium/core/requests";
import type { PageArea, WebPage } from "@widgetarium/web-page";
import { PageHole } from "./page-hole.js";
import type { NativeWebPages } from "./web-page-hosts.js";

const NOT_DONE = "the browser refused {request} for tab {tab}: {reason}";

export function nativeWebPagesOver(studioApp: StartedApp): NativeWebPages {
	return new BrowserModuleWebPages(studioApp);
}

// TRADE-OFF: a host backed by the studio's mediator; web-page runs on a server and cannot import the Device browser module
class BrowserModuleWebPages implements NativeWebPages {
	private readonly holes = new Map<string, PageHole>();

	constructor(private readonly studioApp: StartedApp) {}

	async page(tab: string): Promise<WebPage | null> {
		return pageOf(await this.studioApp.send(BrowserTabsQuery, { heldTabId: tab }), tab);
	}

	area(tab: string): PageArea | null {
		return this.holes.get(tab)?.area ?? null;
	}

	async open(tab: string, url: string): Promise<void> {
		await done("open-page", tab, this.studioApp.send(OpenPageCommand, { tabId: tab }));
		await done(
			"open-address",
			tab,
			this.studioApp.send(OpenAddressCommand, { tabId: tab, address: url, heldTabId: tab }),
		);
	}

	place(tab: string, area: PageArea | null): Promise<void> {
		const held = this.holes.get(tab);

		if (area === null) {
			return this.hidden(tab, held);
		}

		if (held !== undefined) {
			held.moveTo(area);
			return Promise.resolve();
		}

		const hole = PageHole.overFrame(tab, area);
		this.holes.set(tab, hole);
		return done("attach-pages", tab, this.studioApp.send(AttachPagesCommand, { host: hole.element, heldTabId: tab }));
	}

	back(tab: string): Promise<void> {
		return done("go-back", tab, this.studioApp.send(GoBackCommand, { tabId: tab }));
	}

	forward(tab: string): Promise<void> {
		return done("go-forward", tab, this.studioApp.send(GoForwardCommand, { tabId: tab }));
	}

	reload(tab: string): Promise<void> {
		return done("reload-page", tab, this.studioApp.send(ReloadPageCommand, { tabId: tab }));
	}

	async close(tab: string): Promise<void> {
		await done("close-page", tab, this.studioApp.send(ClosePageCommand, { tabId: tab }));
		this.holes.get(tab)?.remove();
		this.holes.delete(tab);
	}

	pagesChanged(changed: () => void): () => void {
		return this.studioApp.routes.watch(BrowserTabsQuery, { heldTabId: null }, changed);
	}

	private hidden(tab: string, held: PageHole | undefined): Promise<void> {
		if (held === undefined) {
			return Promise.resolve();
		}

		held.remove();
		this.holes.delete(tab);
		return done("detach-pages", tab, this.studioApp.send(DetachPagesCommand, { host: held.element, heldTabId: tab }));
	}
}

async function done(request: string, tab: string, answering: Promise<Answer<unknown>>): Promise<void> {
	const answer = await answering;

	if (!answer.ok) {
		throw new Error(NOT_DONE.replace("{request}", request).replace("{tab}", tab).replace("{reason}", answer.reason));
	}
}

function pageOf(answer: Answer<BrowserTabs>, tab: string): WebPage | null {
	const held = answer.ok ? answer.output.tabs.find(({ id }) => id === tab) : undefined;

	if (held === undefined) {
		return null;
	}

	const { url, title, isLoading, canGoBack, canGoForward } = held;
	return { url, title, isLoading, canGoBack, canGoForward };
}
