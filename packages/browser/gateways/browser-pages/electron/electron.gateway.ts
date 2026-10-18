import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContent, PageRegion, PageShot } from "../../../shared/schema/page-read.schema.js";
import { BrowserPagesGateway } from "../browser-pages.gateway.js";
import { ElectronRemote } from "./electron-remote.js";
import { partitionOfProfile } from "../../../shared/lib/browser-profile.js";
import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import { WebviewTab } from "./webview-tab.js";

const FIRST_TAB = "tab-1";
const NO_TAB = 'the browser holds no tab "{tabId}"';

export class ElectronBrowserPagesGateway extends BrowserPagesGateway {
	private readonly watchers = new Set<() => void>();
	private readonly remote: ElectronRemote;
	private readonly held: readonly WebviewTab[];
	private shown = FIRST_TAB;
	private container: HTMLElement | null = null;

	constructor(remote: unknown, profileId: string) {
		super();
		const partition = partitionOfProfile(profileId);
		this.remote = new ElectronRemote(remote);
		this.remote.hardenPartition(partition);
		this.held = [new WebviewTab(FIRST_TAB, this.remote, partition, () => this.told())];
	}

	isAvailable(): boolean {
		return true;
	}

	tabs(): readonly BrowserTab[] {
		return this.held.map((tab) => tab.now());
	}

	shownId(): string | null {
		return this.shown;
	}

	isOnScreen(): boolean {
		return isLaidOnScreen(this.container) && document.visibilityState === "visible";
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => this.watchers.delete(changed);
	}

	attach(into: HTMLElement): void {
		if (this.container === into) {
			return;
		}

		this.detachAll();
		this.container = into;

		for (const tab of this.held) {
			tab.mountIn(into);
			tab.setShown(tab.now().id === this.shown);
		}

		this.told();
	}

	detach(from: HTMLElement): void {
		if (this.container !== from) {
			return;
		}

		this.detachAll();
		this.told();
	}

	open(tabId: string, url: string): void {
		this.tabOf(tabId).open(url);
	}

	show(tabId: string): void {
		this.tabOf(tabId);
		this.shown = tabId;

		for (const tab of this.held) {
			tab.setShown(tab.now().id === tabId);
		}

		this.told();
	}

	back(tabId: string): void {
		this.tabOf(tabId).back();
	}

	forward(tabId: string): void {
		this.tabOf(tabId).forward();
	}

	reload(tabId: string): void {
		this.tabOf(tabId).reload();
	}

	showRefused(tabId: string, address: string): void {
		this.tabOf(tabId).showRefused(address);
	}

	dismissFailure(tabId: string): void {
		this.tabOf(tabId).dismissFailure();
	}

	settled(tabId: string): Promise<void> {
		return this.tabOf(tabId).settled();
	}

	committed(tabId: string): CommittedPage | null {
		return this.tabOf(tabId).committed();
	}

	frameUrls(tabId: string): Promise<readonly string[]> {
		return this.tabOf(tabId).frameUrls();
	}

	hasSecretField(tabId: string): Promise<boolean> {
		return this.tabOf(tabId).hasSecretField();
	}

	content(tabId: string): Promise<PageContent> {
		return this.tabOf(tabId).content();
	}

	capture(tabId: string, region: PageRegion | null): Promise<PageShot> {
		return this.tabOf(tabId).capture(region);
	}

	private detachAll(): void {
		for (const tab of this.held) {
			tab.unmount();
		}

		this.container = null;
	}

	private tabOf(tabId: string): WebviewTab {
		const found = this.held.find((tab) => tab.now().id === tabId);

		if (!found) {
			throw new Error(NO_TAB.replace("{tabId}", tabId));
		}

		return found;
	}

	private told(): void {
		for (const changed of this.watchers) {
			changed();
		}
	}
}
