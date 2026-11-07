import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";
import { WebPagesGateway } from "./web-pages.gateway.js";

interface HeldPage {
	readonly history: readonly string[];
	readonly shownIndex: number;
	readonly area: PageArea | null;
}

// TRADE-OFF: a fake browser for the browser studio and tests; title is the url's host, nothing loads
export class MemoryWebPagesGateway extends WebPagesGateway {
	private readonly pages = new Map<string, HeldPage>();
	private readonly listeners = new Set<() => void>();

	override page(tab: string): Promise<WebPage | null> {
		const held = this.pages.get(tab);
		return Promise.resolve(held === undefined ? null : pageOf(held));
	}

	override pageArea(tab: string): PageArea | null {
		return this.pages.get(tab)?.area ?? null;
	}

	override openPage(tab: string, url: string): Promise<void> {
		const held = this.pages.get(tab);
		const history = held === undefined ? [] : held.history.slice(0, held.shownIndex + 1);
		return this.savePage(tab, {
			history: [...history, url],
			shownIndex: history.length,
			area: held?.area ?? null,
		});
	}

	override placePage(tab: string, area: PageArea | null): Promise<void> {
		return this.changePage(tab, (held) => ({
			...held,
			area,
		}));
	}

	override goBackPage(tab: string): Promise<void> {
		return this.changePage(tab, (held) => ({
			...held,
			shownIndex: Math.max(0, held.shownIndex - 1),
		}));
	}

	override goForwardPage(tab: string): Promise<void> {
		return this.changePage(tab, (held) => ({
			...held,
			shownIndex: Math.min(held.history.length - 1, held.shownIndex + 1),
		}));
	}

	override reloadPage(tab: string): Promise<void> {
		return this.changePage(tab, (held) => held);
	}

	override closePage(tab: string): Promise<void> {
		this.pages.delete(tab);
		this.tellListeners();
		return Promise.resolve();
	}

	override pagesChanged(changed: () => void): () => void {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	}

	private changePage(tab: string, change: (held: HeldPage) => HeldPage): Promise<void> {
		const held = this.pages.get(tab);

		if (held === undefined) {
			return Promise.resolve();
		}

		return this.savePage(tab, change(held));
	}

	private savePage(tab: string, page: HeldPage): Promise<void> {
		this.pages.set(tab, page);
		this.tellListeners();
		return Promise.resolve();
	}

	private tellListeners(): void {
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}

function pageOf({ history, shownIndex }: HeldPage): WebPage {
	const url = history[shownIndex] ?? "";
	return {
		url,
		title: URL.canParse(url) ? new URL(url).host : url,
		isLoading: false,
		canGoBack: shownIndex > 0,
		canGoForward: shownIndex < history.length - 1,
	};
}
