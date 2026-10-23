import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContentRead, PageRegion, PageShot } from "../../../shared/schema/page-read.schema.js";
import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import { regionWithin } from "../../../shared/lib/region-within.js";
import { BrowserPagesGateway } from "../browser-pages.gateway.js";
import { PageCover } from "./page-cover.js";
import { PagePlacementWatch } from "./page-placement.js";
import type { PageEvent, PagePlacement, PagesBridge } from "./pages-bridge.js";
import { TauriPage } from "./tauri-page.js";

const FIRST_TAB = "tab-1";
const NO_TAB = 'the browser holds no tab "{tabId}"';
const OUTSIDE_THE_PAGE = "the asked region lies outside the page on screen";
const IN_PAGE_CHECK_MS = 1000;

interface Attached {
	readonly container: HTMLElement;
	readonly placement: PagePlacementWatch;
	readonly cover: PageCover;
	readonly inPageCheck: ReturnType<typeof setInterval>;
}

export class TauriBrowserPagesGateway extends BrowserPagesGateway {
	private readonly watchers = new Set<() => void>();
	private held: readonly TauriPage[] = [];
	private shown: string | null = FIRST_TAB;
	private attached: Attached | null = null;
	private nativeShown: string | null = null;

	constructor(
		private readonly bridge: PagesBridge,
		private readonly profileId: string,
	) {
		super();
		void bridge
			.open((event) => this.apply(event))
			.catch((failure: unknown) => {
				console.error("[widgetarium] the browser could not listen to its pages", failure);
			});
		document.addEventListener("visibilitychange", () => this.syncNative());
		this.create(FIRST_TAB);
	}

	isAvailable(): boolean {
		return true;
	}

	tabs(): readonly BrowserTab[] {
		return this.held.map((page) => page.now());
	}

	shownId(): string | null {
		return this.shown;
	}

	isOnScreen(tabId: string): boolean {
		const container = this.attached?.container ?? null;

		return tabId === this.shown && isLaidOnScreen(container) && document.visibilityState === "visible";
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => this.watchers.delete(changed);
	}

	attach(into: HTMLElement): void {
		if (this.attached?.container === into) {
			return;
		}

		this.stopAttached();
		this.attached = {
			container: into,
			placement: new PagePlacementWatch(into, (placement) => this.place(placement)),
			cover: new PageCover({
				container: into,
				bridge: this.bridge,
				drawnPage: () => this.drawnPage(),
			}),
			inPageCheck: setInterval(() => this.checkInPageNavigation(), IN_PAGE_CHECK_MS),
		};
		this.told();
	}

	detach(from: HTMLElement): void {
		if (this.attached?.container !== from) {
			return;
		}

		this.stopAttached();
		this.told();
	}

	create(tabId: string): void {
		if (this.held.some((page) => page.now().id === tabId)) {
			return;
		}

		const page = new TauriPage({
			id: tabId,
			bridge: this.bridge,
			profileId: this.profileId,
			changed: () => this.told(),
		});
		this.becomeHeld([...this.held, page], `open ${tabId}`);
	}

	close(tabId: string): void {
		const page = this.held.find((held) => held.now().id === tabId);

		if (!page) {
			return;
		}

		page.destroy();

		if (this.shown === tabId) {
			this.shown = null;
		}

		this.becomeHeld(
			this.held.filter((held) => held !== page),
			`close ${tabId}`,
		);
	}

	freeze(tabId: string): void {
		// TODO: WebKit has no public page freeze; a hidden page relies on its occlusion throttling
		this.pageOf(tabId);
	}

	thaw(tabId: string): void {
		this.pageOf(tabId);
	}

	open(tabId: string, url: string): void {
		this.pageOf(tabId).open(url);
	}

	show(tabId: string): void {
		this.pageOf(tabId);
		this.shown = tabId;
		this.told();
	}

	back(tabId: string): void {
		this.pageOf(tabId).back();
	}

	forward(tabId: string): void {
		this.pageOf(tabId).forward();
	}

	reload(tabId: string): void {
		this.pageOf(tabId).reload();
	}

	showRefused(tabId: string, address: string): void {
		this.pageOf(tabId).showRefused(address);
	}

	dismissFailure(tabId: string): void {
		this.pageOf(tabId).dismissFailure();
	}

	settled(tabId: string): Promise<void> {
		return this.pageOf(tabId).settled();
	}

	committed(tabId: string): CommittedPage | null {
		return this.pageOf(tabId).committed();
	}

	frameUrls(tabId: string): Promise<readonly string[]> {
		return this.pageOf(tabId).frameUrls();
	}

	hasSecretField(tabId: string): Promise<boolean> {
		return this.pageOf(tabId).hasSecretField();
	}

	content(tabId: string): Promise<PageContentRead> {
		return this.pageOf(tabId).content();
	}

	capture(tabId: string, region: PageRegion | null): Promise<PageShot> {
		return this.pageOf(tabId).capture(this.clampedRegion(region));
	}

	private clampedRegion(region: PageRegion | null): PageRegion | null {
		if (region === null) {
			return null;
		}

		const placement = this.attached?.placement.current();
		const clamped = placement ? regionWithin(region, placement) : null;

		if (clamped === null) {
			throw new Error(OUTSIDE_THE_PAGE);
		}

		return clamped;
	}

	private apply(event: PageEvent): void {
		this.held.find((page) => page.now().id === event.page)?.apply(event);
	}

	private place(placement: PagePlacement): void {
		void this.bridge.place(placement).catch((failure: unknown) => {
			console.error("[widgetarium] the browser page could not follow its card", failure);
		});
		this.syncNative();
	}

	private drawnPage(): string | null {
		const attached = this.attached;
		const page = this.held.find((held) => held.now().id === this.shown);

		if (attached === null || !page?.isDrawn() || document.visibilityState !== "visible") {
			return null;
		}

		return isLaidOnScreen(attached.container) ? page.now().id : null;
	}

	private syncNative(): void {
		const drawn = this.drawnPage();
		this.attached?.cover.recheckSoon();

		if (drawn === this.nativeShown) {
			return;
		}

		console.info(`[widgetarium] browser native page ${this.nativeShown} → ${drawn}`);
		this.nativeShown = drawn;
		void this.bridge.show(drawn).catch((failure: unknown) => {
			console.error("[widgetarium] the browser could not show its page", failure);
		});
	}

	private checkInPageNavigation(): void {
		const drawn = this.drawnPage();
		const page = this.held.find((held) => held.now().id === drawn);

		if (drawn === null || page === undefined || page.now().isLoading) {
			return;
		}

		void this.bridge
			.facts(drawn)
			.then((facts) => page.noteFacts(facts))
			.catch(() => undefined);
	}

	private stopAttached(): void {
		const attached = this.attached;

		if (attached === null) {
			return;
		}

		attached.placement.stop();
		attached.cover.stop();
		clearInterval(attached.inPageCheck);
		this.attached = null;
	}

	private becomeHeld(next: readonly TauriPage[], reason: string): void {
		console.info(`[widgetarium] browser pages ${this.held.length} → ${next.length}, shown ${this.shown} (${reason})`);
		this.held = next;
		this.told();
	}

	private pageOf(tabId: string): TauriPage {
		const found = this.held.find((page) => page.now().id === tabId);

		if (!found) {
			throw new Error(NO_TAB.replace("{tabId}", tabId));
		}

		return found;
	}

	private told(): void {
		this.syncNative();

		for (const changed of this.watchers) {
			changed();
		}
	}
}
