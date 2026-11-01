import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";
import { WebPagesGateway } from "./web-pages.gateway.js";

interface HeldPage {
	readonly history: readonly string[];
	readonly at: number;
	readonly area: PageArea | null;
}

// TRADE-OFF: a fake browser for the browser studio and tests; title is the url's host, nothing loads
export class MemoryWebPagesGateway extends WebPagesGateway {
	private readonly held = new Map<string, HeldPage>();
	private readonly listeners = new Set<() => void>();

	override page(tab: string): Promise<WebPage | null> {
		const held = this.held.get(tab);
		return Promise.resolve(held === undefined ? null : pageOf(held));
	}

	override pageArea(tab: string): PageArea | null {
		return this.held.get(tab)?.area ?? null;
	}

	override openPage(tab: string, url: string): Promise<void> {
		const held = this.held.get(tab);
		const history = held === undefined ? [] : held.history.slice(0, held.at + 1);
		return this.saved(tab, {
			history: [...history, url],
			at: history.length,
			area: held?.area ?? null,
		});
	}

	override placePage(tab: string, area: PageArea | null): Promise<void> {
		return this.changed(tab, (held) => ({
			...held,
			area,
		}));
	}

	override pageBack(tab: string): Promise<void> {
		return this.changed(tab, (held) => ({
			...held,
			at: Math.max(0, held.at - 1),
		}));
	}

	override pageForward(tab: string): Promise<void> {
		return this.changed(tab, (held) => ({
			...held,
			at: Math.min(held.history.length - 1, held.at + 1),
		}));
	}

	override reloadPage(tab: string): Promise<void> {
		return this.changed(tab, (held) => held);
	}

	override closePage(tab: string): Promise<void> {
		this.held.delete(tab);
		this.tellChanged();
		return Promise.resolve();
	}

	override pagesChanged(changed: () => void): () => void {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	}

	private changed(tab: string, change: (held: HeldPage) => HeldPage): Promise<void> {
		const held = this.held.get(tab);

		if (held === undefined) {
			return Promise.resolve();
		}

		return this.saved(tab, change(held));
	}

	private saved(tab: string, page: HeldPage): Promise<void> {
		this.held.set(tab, page);
		this.tellChanged();
		return Promise.resolve();
	}

	private tellChanged(): void {
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}

function pageOf({ history, at }: HeldPage): WebPage {
	const url = history[at] ?? "";
	return {
		url,
		title: URL.canParse(url) ? new URL(url).host : url,
		isLoading: false,
		canGoBack: at > 0,
		canGoForward: at < history.length - 1,
	};
}
