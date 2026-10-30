import { MAIN_STUDIO_WINDOW } from "@widgetarium/behaviors";
import { listenToCarry } from "@widgetarium/behaviors";
import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type {
	CommittedPage,
	PageContentRead,
	PageForm,
	PageShot,
	ShotAsk,
} from "../../../shared/schema/page-read.schema.js";
import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import { regionOnScreen } from "../../../shared/lib/region-within.js";
import { BrowserPagesGateway } from "../browser-pages.gateway.js";
import type { PageLook } from "../../../shared/schema/page-look.schema.js";
import type { GhostLay, GhostWorn } from "../../../shared/schema/tear-off-ghost.schema.js";
import { HeldPages } from "./held-pages.js";
import { NativePages } from "./native-pages.js";
import { OwnWindows } from "./own-windows.js";
import type { Attached } from "./page-attachment.js";
import { PageInputReplay } from "./page-input-replay.js";
import { PageLooks } from "./page-looks.js";
import { followTheme } from "./page-theme.js";
import { isOwnWindowEvent, isPageHoveredEvent, isPagePressedEvent, isWindowClosedEvent } from "./pages-bridge.js";
import type { PageEvent, PageLoadEvent, PagePlacement, PagesBridge } from "./pages-bridge.js";
import { PanePages } from "./pane-pages.js";
import { ShownCard } from "./shown-card.js";
import { StudioWindows } from "./studio-windows.js";
import { TearOffGhost } from "./tear-off-ghost.js";

export { tauriPagesBridge } from "./pages-bridge.js";
export type { BrowserPagesIpc } from "./pages-bridge.js";

const FIRST_TAB = "tab-1";
const LOOK_CHANGING_EVENTS: ReadonlySet<PageLoadEvent["kind"]> = new Set(["committed", "finished", "title"]);

export class TauriBrowserPagesGateway extends BrowserPagesGateway {
	private readonly watchers = new Set<() => void>();
	private shown: string | null = FIRST_TAB;
	private readonly pages: HeldPages;
	private readonly card: ShownCard;
	private readonly inPanes: PanePages;
	private readonly ownWindows: OwnWindows;
	private readonly studioWindows: StudioWindows;
	private readonly ghost: TearOffGhost;
	private readonly replay: PageInputReplay;
	private readonly looks: PageLooks;
	private readonly native: NativePages;
	constructor(
		private readonly bridge: PagesBridge,
		profileId: string,
		ownLabel: string = MAIN_STUDIO_WINDOW,
	) {
		super();
		this.pages = new HeldPages({
			bridge,
			profileId,
			ownLabel,
			shownId: () => this.shown,
			changed: () => this.told(),
		});
		this.card = new ShownCard({
			bridge,
			drawnPage: () => this.drawnPage(),
			place: (placement) => this.place(placement),
			sync: () => this.syncNative(),
			checkInPageNavigation: () => this.checkInPageNavigation(),
			stopped: () => this.looks.stop(),
		});
		this.ownWindows = new OwnWindows(bridge, () => this.told());
		this.studioWindows = new StudioWindows({
			bridge,
			ownLabel,
			windowOf: (tabId) => this.pages.heldPageOf(tabId)?.now().window ?? null,
		});
		this.ghost = new TearOffGhost(bridge);
		this.replay = new PageInputReplay((page) => this.containerOf(page));
		this.inPanes = new PanePages({
			bridge,
			drawnIn: (attached, tabId) => this.drawnIn(attached, tabId),
			place: (tabId, placement) => this.placeTab(tabId, placement),
			sync: () => this.syncNative(),
		});
		this.looks = new PageLooks({
			bridge,
			drawnPages: () => this.drawnPages(),
		});
		this.native = new NativePages({
			bridge,
			inPanes: this.inPanes,
			looks: this.looks,
			attached: () => this.card.current(),
		});
		this.listen();
		this.create(FIRST_TAB);
	}

	private listen(): void {
		void this.bridge
			.open((event) => this.apply(event))
			.then(() => this.bridge.ownWindows())
			.then((pages) => this.ownWindows.seed(pages))
			.then(() => this.bridge.standingPages())
			.then((pages) => this.pages.adoptStanding(pages))
			.catch((failure: unknown) => {
				console.error("[widgetarium] the browser could not listen to its pages", failure);
			});
		document.addEventListener("visibilitychange", () => this.syncNative());
		followTheme(this.bridge);
		listenToCarry(() => {
			requestAnimationFrame(() => this.syncNative());
			return false;
		});
	}

	isAvailable(): boolean {
		return true;
	}

	tabs(): readonly BrowserTab[] {
		return this.pages.all().map((page) => page.now());
	}

	shownId(): string | null {
		return this.shown;
	}

	isOnScreen(tabId: string): boolean {
		return this.drawnPage() === tabId || this.inPanes.drawnOf(tabId) !== null;
	}

	pagesChanged(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => this.watchers.delete(changed);
	}

	attach(into: HTMLElement): void {
		if (this.card.attach(into)) {
			this.told();
		}
	}

	detach(from: HTMLElement): void {
		if (this.card.detach(from)) {
			this.told();
		}
	}

	canOpenOwnWindow(): boolean {
		return true;
	}

	isPoppedOut(tabId: string): boolean {
		return this.ownWindows.has(tabId);
	}

	isInOwnWindow(tabId: string): boolean {
		return this.ownWindows.has(tabId) || this.studioWindows.holding(tabId) !== null;
	}

	openInOwnWindow(tabId: string): void {
		const page = this.pages.pageOf(tabId);
		this.ownWindows.open(tabId, page.now().title, page.ensureCreated());
	}

	focusOwnWindow(tabId: string): void {
		const holding = this.studioWindows.holding(tabId);

		if (holding === null) {
			this.ownWindows.focus(tabId);
			return;
		}

		this.studioWindows.focusHolding(tabId, holding);
	}

	focusStudioWindow(window: string): void {
		this.studioWindows.focus(window);
	}

	openChatWindow(chatId: string): void {
		this.studioWindows.openChat(chatId);
	}

	tearOff(tabId: string, openWith: string): void {
		this.studioWindows.tearOff(tabId, openWith);
	}

	layTearOffGhost(lay: GhostLay): Promise<void> {
		return this.ghost.lay(lay);
	}

	wearTearOffGhost(worn: GhostWorn): void {
		this.ghost.wear(worn);
	}

	showTearOffGhost(shown: boolean): void {
		this.ghost.show(shown);
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
		this.pages.create(tabId);
	}

	close(tabId: string): void {
		this.pages.close(tabId, () => {
			this.looks.forget(tabId);
			this.ownWindows.forget(tabId);

			if (this.shown === tabId) {
				this.shown = null;
			}
		});
	}

	freeze(tabId: string): void {
		// TODO: WebKit has no public page freeze; a hidden page relies on its occlusion throttling
		this.pages.pageOf(tabId);
	}

	thaw(tabId: string): void {
		this.pages.pageOf(tabId);
	}

	open(tabId: string, url: string): void {
		this.pages.pageOf(tabId).open(url);
	}

	show(tabId: string): void {
		this.pages.pageOf(tabId);
		this.shown = tabId;
		this.told();
		void this.looks.reread();
	}

	back(tabId: string): void {
		this.pages.pageOf(tabId).back();
	}

	forward(tabId: string): void {
		this.pages.pageOf(tabId).forward();
	}

	reload(tabId: string): void {
		this.pages.pageOf(tabId).reload();
	}

	showRefused(tabId: string, address: string): void {
		this.pages.pageOf(tabId).showRefused(address);
	}

	dismissFailure(tabId: string): void {
		this.pages.pageOf(tabId).dismissFailure();
	}

	settled(tabId: string): Promise<void> {
		return this.pages.pageOf(tabId).settled();
	}

	committed(tabId: string): CommittedPage | null {
		return this.pages.pageOf(tabId).committed();
	}

	frameUrls(tabId: string): Promise<readonly string[]> {
		return this.pages.pageOf(tabId).frameUrls();
	}

	hasSecretField(tabId: string): Promise<boolean> {
		return this.pages.pageOf(tabId).hasSecretField();
	}

	content(tabId: string, form: PageForm): Promise<PageContentRead> {
		return this.pages.pageOf(tabId).content(form);
	}

	look(tabId: string): PageLook | null {
		return this.looks.lookOf(tabId);
	}

	looksChanged(changed: () => void): () => void {
		return this.looks.watch(changed);
	}

	capture(tabId: string, { area, region }: ShotAsk): Promise<PageShot> {
		const asked = area === "page" ? region : regionOnScreen(region, this.card.current()?.placement.current());
		return this.pages.pageOf(tabId).capture({ area, region: asked });
	}

	private apply(event: PageEvent): void {
		if (isPagePressedEvent(event)) {
			this.replay.press(event.page);
			return;
		}

		if (isPageHoveredEvent(event)) {
			this.replay.hover(event.x, event.y);
			return;
		}

		if (isOwnWindowEvent(event)) {
			this.ownWindows.applyEvent(event);
			return;
		}

		if (isWindowClosedEvent(event)) {
			this.pages.leaveWindow(event.window);
			return;
		}

		this.pages.adoptIfUnknown(event.page);
		this.pages.heldPageOf(event.page)?.apply(event);

		if (this.drawnPages().includes(event.page) && LOOK_CHANGING_EVENTS.has(event.kind)) {
			void this.looks.reread();
		}
	}

	private containerOf(page: string): HTMLElement | null {
		return this.inPanes.containerOf(page) ?? (this.shown === page ? (this.card.current()?.container ?? null) : null);
	}

	private drawnPages(): readonly string[] {
		const shown = this.drawnPage();
		const inPanes = this.inPanes.drawnIds();
		return shown === null || inPanes.includes(shown) ? inPanes : [shown, ...inPanes];
	}

	private place(placement: PagePlacement): void {
		if (this.shown === null || this.inPanes.has(this.shown)) {
			this.syncNative();
			return;
		}

		this.placeTab(this.shown, placement);
	}

	private placeTab(page: string, placement: PagePlacement): void {
		if (!this.isInOwnWindow(page)) {
			void this.bridge.place(page, placement).catch((failure: unknown) => {
				console.error("[widgetarium] the browser page could not follow its card", failure);
			});
		}

		this.syncNative();
	}

	private drawnPage(): string | null {
		const shown = this.shown;

		if (shown === null || this.inPanes.has(shown)) {
			return null;
		}

		return this.drawnIn(this.card.current(), shown);
	}

	private drawnIn(attached: Attached | null, tabId: string): string | null {
		const page = this.pages.heldPageOf(tabId);

		if (attached === null || this.isInOwnWindow(tabId) || !page?.isDrawn() || document.visibilityState !== "visible") {
			return null;
		}

		return isLaidOnScreen(attached.container) ? tabId : null;
	}

	private syncNative(): void {
		this.native.follow(this.drawnPage());
	}

	private checkInPageNavigation(): void {
		const drawn = this.drawnPage();

		if (drawn !== null) {
			this.pages.heldPageOf(drawn)?.checkInPageNavigation();
		}
	}

	private told(): void {
		this.syncNative();

		for (const changed of this.watchers) {
			changed();
		}
	}
}
