import { BrowserPagesGateway } from "../packages/browser/gateways/browser-pages/browser-pages.gateway.ts";
import { MemoryBrowserAuditGateway } from "../packages/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/browser/gateways/browser-grants/memory.gateway.ts";
import { browserPartsOf } from "../packages/browser/gateways/browser-parts/browser-parts.gateway.ts";
import type { BrowserParts } from "../packages/browser/gateways/browser-parts/browser-parts.gateway.ts";
import { ClockGateway } from "../packages/browser/gateways/clock/clock.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/browser/gateways/recent-sites/memory.gateway.ts";
import { ChatComposerGateway } from "../packages/browser/gateways/chat-composer/chat-composer.gateway.ts";
import type { BrowserTab } from "../packages/browser/shared/schema/browser-tab.schema.ts";
import type { CommittedPage, PageContentRead, PageShot } from "../packages/browser/shared/schema/page-read.schema.ts";

export class FakeBrowserPagesGateway extends BrowserPagesGateway {
	tab: BrowserTab = {
		id: "tab-1",
		url: "https://example.com/board",
		title: "Example board",
		favicon: "https://example.com/favicon.ico",
		isLoading: false,
		canGoBack: false,
		canGoForward: true,
		failure: null,
	};
	isShownOnScreen = true;
	entry = 1;
	frames: readonly string[] = ["https://example.com/board"];
	hasSecret = false;
	isFieldShownOnlyToRead = false;
	text = "Sprint 7";
	readsAt: string | null = null;
	navigatesWhileReading = false;
	redirectTo: string | null = null;
	duringRead: () => void = () => undefined;
	readonly opened: string[] = [];
	readonly moves: string[] = [];
	readonly attached: HTMLElement[] = [];
	readonly frozen = new Set<string>();
	private readonly watchers = new Set<() => void>();

	isAvailable(): boolean {
		return true;
	}

	tabs(): readonly BrowserTab[] {
		return [this.tab];
	}

	shownId(): string | null {
		return this.tab.id;
	}

	isOnScreen(_tabId: string): boolean {
		return this.isShownOnScreen;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => this.watchers.delete(changed);
	}

	attach(into: HTMLElement): void {
		this.attached.push(into);
	}

	detach(): void {}

	create(_tabId: string): void {}

	close(_tabId: string): void {}

	freeze(tabId: string): void {
		this.frozen.add(tabId);
	}

	thaw(tabId: string): void {
		this.frozen.delete(tabId);
	}

	open(_tabId: string, url: string): void {
		this.opened.push(url);
		this.tab = {
			...this.tab,
			url: this.redirectTo ?? url,
		};
		this.redirectTo = null;
		this.entry += 1;
		this.told();
	}

	show(_tabId: string): void {}

	back(): void {
		this.moves.push("back");
		this.tab = {
			...this.tab,
			url: "https://example.com/board",
		};
		this.told();
	}

	forward(): void {
		this.moves.push("forward");
	}

	reload(): void {
		this.moves.push("reload");
	}

	showRefused(_tabId: string, address: string): void {
		this.tab = {
			...this.tab,
			url: address,
			failure: {
				kind: "scheme",
				address,
				code: "",
			},
		};
		this.told();
	}

	dismissFailure(): void {
		this.moves.push("dismiss");
		this.tab = {
			...this.tab,
			failure: null,
		};
		this.told();
	}

	settled(): Promise<void> {
		return Promise.resolve();
	}

	committed(_tabId: string): CommittedPage | null {
		return {
			url: this.tab.url,
			entry: this.entry,
		};
	}

	frameUrls(): Promise<readonly string[]> {
		return Promise.resolve(this.frames);
	}

	hasSecretField(): Promise<boolean> {
		return Promise.resolve(this.hasSecret);
	}

	content(): Promise<PageContentRead> {
		this.moveIfAsked();
		return Promise.resolve({
			url: this.readsAt ?? this.tab.url,
			title: this.tab.title,
			text: this.text,
			hasSecretField: this.hasSecret || this.isFieldShownOnlyToRead,
		});
	}

	capture(): Promise<PageShot> {
		this.moveIfAsked();
		return Promise.resolve({
			url: this.tab.url,
			png: "iVBORw0KGgo=",
			width: 10,
			height: 10,
		});
	}

	told(): void {
		for (const changed of this.watchers) {
			changed();
		}
	}

	private moveIfAsked(): void {
		this.duringRead();

		if (this.navigatesWhileReading) {
			this.entry += 1;
		}
	}
}

export class FakeChatComposerGateway extends ChatComposerGateway {
	readonly prefilled: string[] = [];

	prefill(text: string): Promise<void> {
		this.prefilled.push(text);
		return Promise.resolve();
	}
}

const LONGEST_WAIT_MS = 1000;

export class HurriedClockGateway extends ClockGateway {
	now(): number {
		return Date.now();
	}

	after(ms: number, run: () => void): () => void {
		const timer = setTimeout(run, Math.min(ms, LONGEST_WAIT_MS));
		return () => clearTimeout(timer);
	}
}

export interface FakeBrowser {
	readonly pages: FakeBrowserPagesGateway;
	readonly audit: MemoryBrowserAuditGateway;
	readonly grants: MemoryBrowserGrantsGateway;
	readonly recentSites: MemoryRecentSitesGateway;
	readonly chatComposer: FakeChatComposerGateway;
	readonly parts: BrowserParts;
}

export function fakeBrowser(pages = new FakeBrowserPagesGateway()): FakeBrowser {
	const audit = new MemoryBrowserAuditGateway();
	const grants = new MemoryBrowserGrantsGateway();
	const recentSites = new MemoryRecentSitesGateway();
	const chatComposer = new FakeChatComposerGateway();
	return {
		pages,
		audit,
		grants,
		recentSites,
		chatComposer,
		parts: browserPartsOf({
			browserPagesGateway: pages,
			browserGrantsGateway: grants,
			browserAuditGateway: audit,
			clockGateway: new HurriedClockGateway(),
			recentSitesGateway: recentSites,
			chatComposerGateway: chatComposer,
		}),
	};
}
