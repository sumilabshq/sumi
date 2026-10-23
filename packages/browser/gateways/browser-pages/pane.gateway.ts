import type { BrowserTab } from "../../shared/schema/browser-tab.schema.js";
import type { PageLook } from "../../shared/schema/page-look.schema.js";
import type { CommittedPage, PageContentRead, PageRegion, PageShot } from "../../shared/schema/page-read.schema.js";
import { BrowserPagesGateway } from "./browser-pages.gateway.js";

export class PaneBrowserPagesGateway extends BrowserPagesGateway {
	constructor(
		private readonly shared: BrowserPagesGateway,
		private readonly tabId: string,
	) {
		super();
	}

	isAvailable(): boolean {
		return this.shared.isAvailable();
	}

	tabs(): readonly BrowserTab[] {
		return this.shared.tabs();
	}

	shownId(): string | null {
		return this.tabId;
	}

	isOnScreen(tabId: string): boolean {
		return tabId === this.tabId && this.shared.isOnScreen(tabId);
	}

	watch(changed: () => void): () => void {
		return this.shared.watch(changed);
	}

	attach(into: HTMLElement): void {
		this.shared.attachInPane(this.tabId, into);
	}

	detach(from: HTMLElement): void {
		this.shared.detachFromPane(this.tabId, from);
	}

	attachInPane(tabId: string, into: HTMLElement): void {
		this.shared.attachInPane(tabId, into);
	}

	detachFromPane(tabId: string, from: HTMLElement): void {
		this.shared.detachFromPane(tabId, from);
	}

	isInOwnWindow(tabId: string): boolean {
		return this.shared.isInOwnWindow(tabId);
	}

	openInOwnWindow(tabId: string): void {
		this.shared.openInOwnWindow(tabId);
	}

	focusOwnWindow(tabId: string): void {
		this.shared.focusOwnWindow(tabId);
	}

	create(tabId: string): void {
		this.shared.create(tabId);
	}

	close(tabId: string): void {
		this.shared.close(tabId);
	}

	freeze(tabId: string): void {
		this.shared.freeze(tabId);
	}

	thaw(tabId: string): void {
		this.shared.thaw(tabId);
	}

	open(tabId: string, url: string): void {
		this.shared.open(tabId, url);
	}

	show(tabId: string): void {
		if (tabId !== this.tabId) {
			console.info(`[widgetarium] a pane holding ${this.tabId} keeps it, asked to show ${tabId}`);
		}
	}

	back(tabId: string): void {
		this.shared.back(tabId);
	}

	forward(tabId: string): void {
		this.shared.forward(tabId);
	}

	reload(tabId: string): void {
		this.shared.reload(tabId);
	}

	showRefused(tabId: string, address: string): void {
		this.shared.showRefused(tabId, address);
	}

	dismissFailure(tabId: string): void {
		this.shared.dismissFailure(tabId);
	}

	settled(tabId: string): Promise<void> {
		return this.shared.settled(tabId);
	}

	committed(tabId: string): CommittedPage | null {
		return this.shared.committed(tabId);
	}

	frameUrls(tabId: string): Promise<readonly string[]> {
		return this.shared.frameUrls(tabId);
	}

	hasSecretField(tabId: string): Promise<boolean> {
		return this.shared.hasSecretField(tabId);
	}

	content(tabId: string): Promise<PageContentRead> {
		return this.shared.content(tabId);
	}

	look(tabId: string): PageLook | null {
		return this.shared.look(tabId);
	}

	watchLook(changed: () => void): () => void {
		return this.shared.watchLook(changed);
	}

	capture(tabId: string, region: PageRegion | null): Promise<PageShot> {
		return this.shared.capture(tabId, region);
	}
}
