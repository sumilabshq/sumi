import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type {
	CommittedPage,
	PageContentRead,
	PageForm,
	PageShot,
	ShotAsk,
} from "../../../shared/schema/page-read.schema.js";
import { BrowserPagesGateway } from "../browser-pages.gateway.js";
import { ElectronRemote } from "./electron-remote.js";
import { partitionOfProfile } from "../../../shared/lib/browser-profile.js";
import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import { WebviewTab } from "./webview-tab.js";

const FIRST_TAB = "tab-1";
const NO_TAB = 'the browser holds no tab "{tabId}"';
const NO_PAGE_SHOT = "this host shoots only the part of a page on screen";
const NO_DOM_READ = "this host reads a page only as text";

export class ElectronBrowserPagesGateway extends BrowserPagesGateway {
	private readonly watchers = new Set<() => void>();
	private readonly remote: ElectronRemote;
	private readonly partition: string;
	private held: readonly WebviewTab[] = [];
	private shown: string | null = FIRST_TAB;
	private container: HTMLElement | null = null;

	constructor(remote: unknown, profileId: string) {
		super();
		this.partition = partitionOfProfile(profileId);
		this.remote = new ElectronRemote(remote);
		this.remote.hardenPartition(this.partition);
		this.create(FIRST_TAB);
	}

	look(): null {
		return null;
	}

	looksChanged(): () => void {
		return () => undefined;
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

	isOnScreen(tabId: string): boolean {
		return tabId === this.shown && isLaidOnScreen(this.container) && document.visibilityState === "visible";
	}

	pagesChanged(changed: () => void): () => void {
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

	// TODO: panes in Obsidian's webviews, one container per tab
	attachInPane(): void {}

	detachFromPane(): void {}

	canOpenOwnWindow(): boolean {
		return false;
	}

	isPoppedOut(): boolean {
		return false;
	}

	isInOwnWindow(): boolean {
		return false;
	}

	// TODO: tear a webview out into its own Obsidian window
	openInOwnWindow(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	focusOwnWindow(): void {}

	focusStudioWindow(): void {}

	openChatWindow(): void {}

	tearOff(): void {}

	layTearOffGhost(): Promise<void> {
		return Promise.resolve();
	}

	wearTearOffGhost(): void {}

	showTearOffGhost(): void {}

	create(tabId: string): void {
		if (this.held.some((tab) => tab.now().id === tabId)) {
			return;
		}

		const page = new WebviewTab(tabId, this.remote, this.partition, () => this.told());

		if (this.container) {
			page.mountIn(this.container);
		}

		page.setShown(tabId === this.shown);
		this.becomeHeld([...this.held, page], `open ${tabId}`);
	}

	close(tabId: string): void {
		const page = this.held.find((tab) => tab.now().id === tabId);

		if (!page) {
			return;
		}

		page.destroy();

		if (this.shown === tabId) {
			this.shown = null;
		}

		this.becomeHeld(
			this.held.filter((tab) => tab !== page),
			`close ${tabId}`,
		);
	}

	freeze(tabId: string): void {
		this.tabOf(tabId).setFrozen(true);
	}

	thaw(tabId: string): void {
		this.tabOf(tabId).setFrozen(false);
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

	content(tabId: string, form: PageForm): Promise<PageContentRead> {
		if (form === "dom") {
			return Promise.reject(new Error(NO_DOM_READ));
		}

		return this.tabOf(tabId).content();
	}

	capture(tabId: string, { area, region }: ShotAsk): Promise<PageShot> {
		if (area === "page") {
			return Promise.reject(new Error(NO_PAGE_SHOT));
		}

		return this.tabOf(tabId).capture(region);
	}

	private becomeHeld(next: readonly WebviewTab[], reason: string): void {
		console.info(`[widgetarium] browser pages ${this.held.length} → ${next.length}, shown ${this.shown} (${reason})`);
		this.held = next;
		this.told();
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
