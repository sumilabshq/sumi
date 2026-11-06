import { MAIN_STUDIO_WINDOW, listenToCarry } from "@widgetarium/behaviors";
import type { BrowserTab } from "../../../shared/schema/browser-tab.schema.js";
import type {
	CommittedPage,
	PageContentRead,
	PageForm,
	PageShot,
	ShotAsk,
} from "../../../shared/schema/page-read.schema.js";
import { regionOnScreen } from "../../../shared/lib/region-within.js";
import { BrowserPagesGateway } from "../browser-pages.gateway.js";
import type { PageLook } from "../../../shared/schema/page-look.schema.js";
import type { GhostLay, GhostWorn } from "../../../shared/schema/tear-off-ghost.schema.js";
import { DrawnPages } from "./drawn-pages.js";
import { HeldPages } from "./held-pages.js";
import { OwnWindows } from "./own-windows.js";
import { PageIcons } from "./page-icons.js";
import { PageInputReplay } from "./page-input-replay.js";
import { followTheme } from "./page-theme.js";
import { isOwnWindowEvent, isPageInputEvent, isWindowClosedEvent } from "./pages-bridge.js";
import type { PageEvent, PageLoadEvent, PagesBridge } from "./pages-bridge.js";
import { StudioWindows } from "./studio-windows.js";
import { TearOffGhost } from "./tear-off-ghost.js";
import { MemorySiteFilesGateway } from "../../site-files/memory.gateway.js";
import type { SiteFilesGateway } from "../../site-files/site-files.gateway.js";
import { MemorySiteIconsGateway } from "../../site-icons/memory.gateway.js";
import type { SiteIconsGateway } from "../../site-icons/site-icons.gateway.js";
import { isStudioOnScreen } from "./studio-on-screen.js";
import { ChangeBell } from "./change-bell.js";
import { UnloadablePages } from "./unloadable-pages.js";

export { tauriPagesBridge } from "./pages-bridge.js";
export type { BrowserPagesIpc } from "./pages-bridge.js";

const FIRST_TAB = "tab-1";

export interface TauriPagesHold {
	readonly profileId: string;
	readonly ownLabel?: string;
	readonly siteIcons?: SiteIconsGateway;
	readonly siteFiles?: SiteFilesGateway;
}

const ICON_READING_EVENTS: ReadonlySet<PageLoadEvent["kind"]> = new Set(["finished", "title"]);
const LOOK_CHANGING_EVENTS: ReadonlySet<PageLoadEvent["kind"]> = new Set(["committed", "finished", "title"]);

export class TauriBrowserPagesGateway extends BrowserPagesGateway {
	private readonly changes = new ChangeBell();
	private readonly replay = new PageInputReplay((page) => this.drawn.containerOf(page));
	private readonly heldPages: HeldPages;
	private readonly ownWindows: OwnWindows;
	private readonly studioWindows: StudioWindows;
	private readonly ghost: TearOffGhost;
	private readonly drawn: DrawnPages;
	private readonly icons: PageIcons;
	private readonly unloading: UnloadablePages;

	constructor(
		private readonly bridge: PagesBridge,
		{
			profileId,
			ownLabel = MAIN_STUDIO_WINDOW,
			siteIcons = new MemorySiteIconsGateway(),
			siteFiles = new MemorySiteFilesGateway(),
		}: TauriPagesHold,
	) {
		super();
		this.heldPages = this.createHeldPages(profileId);
		this.icons = this.createPageIcons(siteIcons, siteFiles);
		this.ownWindows = new OwnWindows(bridge, () => this.told());
		this.studioWindows = this.createStudioWindows(ownLabel);
		this.ghost = new TearOffGhost(bridge);
		this.drawn = this.createDrawnPages();
		this.unloading = new UnloadablePages({
			heldPages: this.heldPages,
			drawn: this.drawn,
			bridge,
			isInOwnWindow: (tabId) => this.isInOwnWindow(tabId),
			ownLabel,
		});
		this.unloading.start();
		this.listenToBridge();
		this.listenToStudio();
		this.create(FIRST_TAB, null);
	}

	isAvailable(): boolean {
		return true;
	}

	tabs(): readonly BrowserTab[] {
		return this.heldPages.pages().map((page) => page.now());
	}

	shownId(): string | null {
		return this.drawn.shownId();
	}

	isOnScreen(tabId: string): boolean {
		return this.drawn.isOnScreen(tabId);
	}

	pagesChanged(changed: () => void): () => void {
		return this.changes.listen(changed);
	}

	attach(into: HTMLElement): void {
		if (this.drawn.attachIfNew(into)) {
			this.told();
		}
	}

	detach(from: HTMLElement): void {
		if (this.drawn.detachIfCurrent(from)) {
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
		return this.ownWindows.has(tabId) || this.studioWindows.otherWindowHolding(tabId) !== null;
	}

	openInOwnWindow(tabId: string): void {
		const page = this.heldPages.pageOf(tabId);
		this.unloading.wake(tabId);
		this.ownWindows.open(tabId, page.now().title, page.ensureCreated());
	}

	focusOwnWindow(tabId: string): void {
		const holdingWindow = this.studioWindows.otherWindowHolding(tabId);

		if (holdingWindow === null) {
			this.ownWindows.focus(tabId);
			return;
		}

		this.studioWindows.focusHolding(tabId, holdingWindow);
	}

	focusStudioWindow(windowLabel: string): void {
		this.studioWindows.focus(windowLabel);
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
		this.unloading.wake(tabId);

		if (this.drawn.attachInPaneIfNew(tabId, into)) {
			this.told();
		}
	}

	detachFromPane(tabId: string, from: HTMLElement): void {
		if (this.drawn.detachFromPaneIfCurrent(tabId, from)) {
			this.told();
		}
	}

	create(tabId: string, profileId: string | null): void {
		this.heldPages.create(tabId, profileId);
	}

	close(tabId: string): void {
		const page = this.heldPages.destroy(tabId);

		if (page === undefined) {
			return;
		}

		this.drawn.looks.forget(tabId);
		this.icons.forget(tabId);
		this.ownWindows.forget(tabId);
		this.drawn.forgetShown(tabId);
		this.heldPages.drop(page);
	}

	freeze(tabId: string): void {
		// TODO: WebKit has no public page freeze; a hidden page relies on its occlusion throttling
		this.heldPages.pageOf(tabId);
	}

	thaw(tabId: string): void {
		this.heldPages.pageOf(tabId);
	}

	open(tabId: string, url: string): void {
		this.heldPages.pageOf(tabId).open(url);
	}

	show(tabId: string): void {
		this.heldPages.pageOf(tabId);
		this.unloading.wake(tabId);
		this.drawn.show(tabId);
		this.told();
		void this.drawn.looks.reread();
	}

	back(tabId: string): void {
		this.heldPages.pageOf(tabId).back();
	}

	forward(tabId: string): void {
		this.heldPages.pageOf(tabId).forward();
	}

	reload(tabId: string): void {
		this.heldPages.pageOf(tabId).reload();
	}

	showRefused(tabId: string, address: string): void {
		this.heldPages.pageOf(tabId).showRefused(address);
	}

	dismissFailure(tabId: string): void {
		this.heldPages.pageOf(tabId).dismissFailure();
	}

	settled(tabId: string): Promise<void> {
		return this.heldPages.pageOf(tabId).settled();
	}

	committed(tabId: string): CommittedPage | null {
		return this.heldPages.pageOf(tabId).committed();
	}

	frameUrls(tabId: string): Promise<readonly string[]> {
		return this.heldPages.pageOf(tabId).frameUrls();
	}

	hasSecretField(tabId: string): Promise<boolean> {
		return this.heldPages.pageOf(tabId).hasSecretField();
	}

	content(tabId: string, form: PageForm): Promise<PageContentRead> {
		return this.heldPages.pageOf(tabId).content(form);
	}

	look(tabId: string): PageLook | null {
		return this.drawn.looks.lookOf(tabId);
	}

	looksChanged(changed: () => void): () => void {
		return this.drawn.looks.watch(changed);
	}

	capture(tabId: string, { area, region }: ShotAsk): Promise<PageShot> {
		const asked = area === "page" ? region : regionOnScreen(region, this.drawn.shownPlacement());
		return this.heldPages.pageOf(tabId).capture({ area, region: asked });
	}

	private createHeldPages(profileId: string): HeldPages {
		return new HeldPages({
			bridge: this.bridge,
			profileId,
			changed: () => this.told(),
		});
	}

	private createPageIcons(siteIcons: SiteIconsGateway, siteFiles: SiteFilesGateway): PageIcons {
		return new PageIcons({
			bridge: this.bridge,
			siteIcons,
			siteFiles,
			drawnPages: () => this.drawn.drawnPages(),
			isOnScreen: isStudioOnScreen,
			wear: (page, worn) => this.heldPages.heldPageOf(page)?.wearFavicon(worn),
		});
	}

	private createStudioWindows(ownLabel: string): StudioWindows {
		return new StudioWindows({
			bridge: this.bridge,
			ownLabel,
			windowOf: (tabId) => this.heldPages.heldPageOf(tabId)?.now().window ?? null,
		});
	}

	private createDrawnPages(): DrawnPages {
		return new DrawnPages(
			{
				bridge: this.bridge,
				heldPages: this.heldPages,
				isInOwnWindow: (tabId) => this.isInOwnWindow(tabId),
			},
			FIRST_TAB,
		);
	}

	private listenToBridge(): void {
		void this.bridge
			.open((event) => this.apply(event))
			.then(() => this.bridge.ownWindows())
			.then((pages) => this.ownWindows.seed(pages))
			.then(() => this.bridge.standingPages())
			.then((pages) => this.heldPages.adoptStanding(pages))
			.catch((failure: unknown) => {
				console.error("[widgetarium] the browser could not listen to its pages", failure);
			});
	}

	private listenToStudio(): void {
		// TODO: listeners live as long as the window; no stop point to remove them
		document.addEventListener("visibilitychange", () => this.drawn.sync());
		followTheme(this.bridge);
		listenToCarry(() => {
			requestAnimationFrame(() => this.drawn.sync());
			return false;
		});
	}

	private apply(event: PageEvent): void {
		if (isPageInputEvent(event)) {
			this.replay.replay(event);
			return;
		}

		if (isOwnWindowEvent(event)) {
			this.ownWindows.applyEvent(event);
			return;
		}

		if (isWindowClosedEvent(event)) {
			this.heldPages.leaveWindow(event.window);
			return;
		}

		this.applyLoadEvent(event);
	}

	private applyLoadEvent(event: PageLoadEvent): void {
		this.heldPages.adoptIfStanding(event.page);
		this.heldPages.heldPageOf(event.page)?.apply(event);
		this.followIcon(event);

		if (this.drawn.drawnPages().includes(event.page) && LOOK_CHANGING_EVENTS.has(event.kind)) {
			void this.drawn.looks.reread();
		}
	}

	private followIcon(event: PageLoadEvent): void {
		if (ICON_READING_EVENTS.has(event.kind)) {
			void this.icons.readNow(event.page);
			return;
		}

		if (event.kind !== "committed") {
			return;
		}

		this.icons.forget(event.page);

		if (this.heldPages.heldPageOf(event.page)?.now().favicon === null) {
			this.icons.wearRemembered(event.page, event.facts.url);
		}
	}

	private told(): void {
		this.drawn.sync();
		this.changes.ring();
	}
}
