import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContentRead, PageRegion, PageShot } from "../../../shared/schema/page-read.schema.js";
import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import { regionOnScreen } from "../../../shared/lib/region-within.js";
import { BrowserPagesGateway } from "../browser-pages.gateway.js";
import type { PageLook } from "../../../shared/schema/page-look.schema.js";
import { OwnWindows } from "./own-windows.js";
import { frameIn, stopAttachment } from "./page-attachment.js";
import type { Attached } from "./page-attachment.js";
import { PageCover } from "./page-cover.js";
import { PageLooks } from "./page-looks.js";
import { PagePlacementWatch } from "./page-placement.js";
import type { PageEvent, PageFrame, PagePlacement, PagesBridge } from "./pages-bridge.js";
import { PanePages } from "./pane-pages.js";
import { TauriPage } from "./tauri-page.js";

const FIRST_TAB = "tab-1";
const NO_TAB = 'the browser holds no tab "{tabId}"';
const IN_PAGE_CHECK_MS = 1000;
const LOOK_CHANGING_EVENTS: ReadonlySet<PageEvent["kind"]> = new Set(["committed", "finished", "title"]);

export class TauriBrowserPagesGateway extends BrowserPagesGateway {
	private readonly watchers = new Set<() => void>();
	private held: readonly TauriPage[] = [];
	private shown: string | null = FIRST_TAB;
	private attached: Attached | null = null;
	private readonly inPanes: PanePages;
	private readonly ownWindows: OwnWindows;
	private nativeShown = "";
	private readonly looks: PageLooks;

	constructor(
		private readonly bridge: PagesBridge,
		private readonly profileId: string,
	) {
		super();
		this.ownWindows = new OwnWindows(bridge, () => this.told());
		this.inPanes = new PanePages({
			bridge,
			drawnIn: (attached, tabId) => this.drawnIn(attached, tabId),
			place: (tabId, placement) => this.placeTab(tabId, placement),
			sync: () => this.syncNative(),
		});
		this.looks = new PageLooks({
			bridge,
			drawnPage: () => this.drawnPage(),
			stripWidth: () => this.attached?.placement.current().width ?? 0,
		});
		this.listen();
		this.create(FIRST_TAB);
	}

	private listen(): void {
		void this.bridge
			.open((event) => this.apply(event))
			.then(() => this.bridge.ownWindows())
			.then((pages) => this.ownWindows.seed(pages))
			.catch((failure: unknown) => {
				console.error("[widgetarium] the browser could not listen to its pages", failure);
			});
		document.addEventListener("visibilitychange", () => this.syncNative());
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
		return this.drawnPage() === tabId || this.inPanes.drawnOf(tabId) !== null;
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
		this.attached = this.attachedTo(into);
		this.told();
	}

	private attachedTo(container: HTMLElement): Attached {
		return {
			container,
			placement: new PagePlacementWatch(
				container,
				(placement) => this.place(placement),
				() => this.syncNative(),
			),
			cover: new PageCover({ container, bridge: this.bridge, drawnPage: () => this.drawnPage() }),
			inPageCheck: setInterval(() => this.checkInPageNavigation(), IN_PAGE_CHECK_MS),
		};
	}

	detach(from: HTMLElement): void {
		if (this.attached?.container !== from) {
			return;
		}

		this.stopAttached();
		this.told();
	}

	isInOwnWindow(tabId: string): boolean {
		return this.ownWindows.has(tabId);
	}

	openInOwnWindow(tabId: string): void {
		this.ownWindows.open(tabId, this.pageOf(tabId).now().title);
	}

	focusOwnWindow(tabId: string): void {
		this.ownWindows.focus(tabId);
	}

	attachInPane(tabId: string, into: HTMLElement): void {
		if (this.inPanes.attach(tabId, into)) {
			this.told();
		}
	}

	detachFromPane(tabId: string, from: HTMLElement): void {
		if (this.inPanes.detach(tabId, from)) {
			this.told();
		}
	}

	create(tabId: string): void {
		if (this.heldPageOf(tabId) !== undefined) {
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
		const page = this.heldPageOf(tabId);

		if (!page) {
			return;
		}

		page.destroy();
		this.looks.forget(tabId);

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
		void this.looks.reread();
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

	look(tabId: string): PageLook | null {
		return this.looks.lookOf(tabId);
	}

	watchLook(changed: () => void): () => void {
		return this.looks.watch(changed);
	}

	capture(tabId: string, region: PageRegion | null): Promise<PageShot> {
		return this.pageOf(tabId).capture(regionOnScreen(region, this.attached?.placement.current()));
	}

	private apply(event: PageEvent): void {
		if (this.ownWindows.applyEvent(event)) {
			return;
		}

		this.heldPageOf(event.page)?.apply(event);

		if (event.page === this.shown && LOOK_CHANGING_EVENTS.has(event.kind)) {
			void this.looks.reread();
		}
	}

	private place(placement: PagePlacement): void {
		const page = this.shown;

		if (page === null || this.inPanes.has(page)) {
			this.syncNative();
			return;
		}

		this.placeTab(page, placement);
	}

	private placeTab(page: string, placement: PagePlacement): void {
		void this.bridge.place(page, placement).catch((failure: unknown) => {
			console.error("[widgetarium] the browser page could not follow its card", failure);
		});
		this.syncNative();
	}

	private drawnPage(): string | null {
		const shown = this.shown;

		if (shown === null || this.inPanes.has(shown)) {
			return null;
		}

		return this.drawnIn(this.attached, shown);
	}

	private drawnIn(attached: Attached | null, tabId: string): string | null {
		const page = this.heldPageOf(tabId);

		if (attached === null || this.ownWindows.has(tabId) || !page?.isDrawn() || document.visibilityState !== "visible") {
			return null;
		}

		return isLaidOnScreen(attached.container) ? tabId : null;
	}

	private syncNative(): void {
		const drawn = this.drawnPage();
		this.followCovers(drawn);
		this.followLooks(drawn !== null);
		const frames = this.framesNow(drawn);
		const shownKey = frames.map((frame) => frame.page).join(" ");

		if (shownKey === this.nativeShown) {
			return;
		}

		console.info(`[widgetarium] browser native pages [${this.nativeShown}] → [${shownKey}]`);
		this.nativeShown = shownKey;
		void this.bridge.show(frames).catch((failure: unknown) => {
			console.error("[widgetarium] the browser could not show its page", failure);
		});
	}

	private followCovers(drawn: string | null): void {
		this.attached?.cover.follow(drawn !== null);
		this.attached?.cover.recheckSoon();
		this.inPanes.followCovers();
	}

	private framesNow(drawn: string | null): readonly PageFrame[] {
		const main = drawn === null ? [] : frameIn(this.attached, drawn);
		return [...main, ...this.inPanes.frames()];
	}

	private followLooks(isDrawn: boolean): void {
		if (isDrawn) {
			this.looks.start();
			return;
		}

		this.looks.stop();
	}

	private checkInPageNavigation(): void {
		const drawn = this.drawnPage();
		const page = drawn === null ? undefined : this.heldPageOf(drawn);

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

		stopAttachment(attached);
		this.looks.stop();
		this.attached = null;
	}

	private becomeHeld(next: readonly TauriPage[], reason: string): void {
		console.info(`[widgetarium] browser pages ${this.held.length} → ${next.length}, shown ${this.shown} (${reason})`);
		this.held = next;
		this.told();
	}

	private pageOf(tabId: string): TauriPage {
		const found = this.heldPageOf(tabId);

		if (!found) {
			throw new Error(NO_TAB.replace("{tabId}", tabId));
		}

		return found;
	}

	private heldPageOf(tabId: string): TauriPage | undefined {
		return this.held.find((page) => page.now().id === tabId);
	}

	private told(): void {
		this.syncNative();

		for (const changed of this.watchers) {
			changed();
		}
	}
}
