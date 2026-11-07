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
import type { Answer, Runtime } from "@widgetarium/data-framework";
import type { PageArea, WebPage } from "@widgetarium/web-page";
import { PageHole } from "./page-hole.js";
import type { NativeWebPages } from "@widgetarium/web-page/module";

const REFUSED = "the browser refused {request} for tab {tab}: {reason}";

export function nativeWebPagesOver(studioApp: Runtime): NativeWebPages {
	return new BrowserModuleWebPages(studioApp);
}

// TRADE-OFF: a host backed by the studio's mediator; web-page runs on a server and cannot import the Device browser module
class BrowserModuleWebPages implements NativeWebPages {
	private readonly holes = new Map<string, PageHole>();

	constructor(private readonly studioApp: Runtime) {}

	async page(tab: string): Promise<WebPage | null> {
		return pageOf(await this.studioApp.send(BrowserTabsQuery, { heldTabId: tab }), tab);
	}

	pageArea(tab: string): PageArea | null {
		return this.holes.get(tab)?.area ?? null;
	}

	async openPage(tab: string, url: string, profileId: string): Promise<void> {
		await throwIfRefused("open-page", tab, this.studioApp.send(OpenPageCommand, { tabId: tab, profileId }));
		await throwIfRefused(
			"open-address",
			tab,
			this.studioApp.send(OpenAddressCommand, { tabId: tab, address: url, heldTabId: tab }),
		);
	}

	async placePage(tab: string, area: PageArea | null): Promise<void> {
		const held = this.holes.get(tab);

		if (area === null) {
			return this.detachHole(tab, held);
		}

		if (held !== undefined) {
			held.moveTo(area);
			return;
		}

		const hole = await this.attachHole(tab, area);
		this.holes.get(tab)?.remove();
		this.holes.set(tab, hole);
	}

	private async attachHole(tab: string, area: PageArea): Promise<PageHole> {
		const hole = PageHole.overAnchor(tab, area);

		try {
			await throwIfRefused(
				"attach-pages",
				tab,
				this.studioApp.send(AttachPagesCommand, { host: hole.element, heldTabId: tab }),
			);
			return hole;
		} catch (failure: unknown) {
			hole.remove();
			throw failure;
		}
	}

	goBackPage(tab: string): Promise<void> {
		return throwIfRefused("go-back", tab, this.studioApp.send(GoBackCommand, { tabId: tab }));
	}

	goForwardPage(tab: string): Promise<void> {
		return throwIfRefused("go-forward", tab, this.studioApp.send(GoForwardCommand, { tabId: tab }));
	}

	reloadPage(tab: string): Promise<void> {
		return throwIfRefused("reload-page", tab, this.studioApp.send(ReloadPageCommand, { tabId: tab }));
	}

	async closePage(tab: string): Promise<void> {
		this.holes.get(tab)?.remove();
		this.holes.delete(tab);

		if ((await this.page(tab)) === null) {
			console.info(`[widgetarium] web page ${tab} close skipped: the browser holds no page for it`);
			return;
		}

		await throwIfRefused("close-page", tab, this.studioApp.send(ClosePageCommand, { tabId: tab }));
	}

	pagesChanged(changed: () => void): () => void {
		return this.studioApp.routes.watch(BrowserTabsQuery, { heldTabId: null }, changed);
	}

	private detachHole(tab: string, held: PageHole | undefined): Promise<void> {
		if (held === undefined) {
			return Promise.resolve();
		}

		held.remove();
		this.holes.delete(tab);
		return throwIfRefused(
			"detach-pages",
			tab,
			this.studioApp.send(DetachPagesCommand, { host: held.element, heldTabId: tab }),
		);
	}
}

async function throwIfRefused(request: string, tab: string, answering: Promise<Answer<unknown>>): Promise<void> {
	const answer = await answering;

	if (!answer.ok) {
		throw new Error(REFUSED.replace("{request}", request).replace("{tab}", tab).replace("{reason}", answer.reason));
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
