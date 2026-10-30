import { isLaidOnScreen } from "../../../shared/lib/is-laid-on-screen.js";
import type { HeldPages } from "./held-pages.js";
import { NativePages } from "./native-pages.js";
import type { Attached } from "./page-attachment.js";
import { PageLooks } from "./page-looks.js";
import type { PagePlacement, PagesBridge } from "./pages-bridge.js";
import { PanePages } from "./pane-pages.js";
import { ShownCard } from "./shown-card.js";

interface DrawnPagesPorts {
	readonly bridge: PagesBridge;
	readonly heldPages: HeldPages;
	readonly isInOwnWindow: (tabId: string) => boolean;
}

export class DrawnPages {
	readonly looks: PageLooks;
	private readonly shownCard: ShownCard;
	private readonly inPanes: PanePages;
	private readonly nativePages: NativePages;

	constructor(
		private readonly ports: DrawnPagesPorts,
		private shown: string | null,
	) {
		this.shownCard = this.createShownCard();
		this.inPanes = this.createPanePages();
		this.looks = new PageLooks({
			bridge: ports.bridge,
			drawnPages: () => this.drawnPages(),
		});
		this.nativePages = this.createNativePages();
	}

	shownId(): string | null {
		return this.shown;
	}

	show(tabId: string): void {
		this.shown = tabId;
	}

	forgetShown(tabId: string): void {
		if (this.shown === tabId) {
			this.shown = null;
		}
	}

	isOnScreen(tabId: string): boolean {
		return this.drawnPage() === tabId || this.inPanes.drawnOf(tabId) !== null;
	}

	attachIfNew(into: HTMLElement): boolean {
		return this.shownCard.attachIfNew(into);
	}

	detachIfCurrent(from: HTMLElement): boolean {
		return this.shownCard.detachIfCurrent(from);
	}

	attachInPaneIfNew(tabId: string, into: HTMLElement): boolean {
		return this.inPanes.attachIfNew(tabId, into);
	}

	detachFromPaneIfCurrent(tabId: string, from: HTMLElement): boolean {
		return this.inPanes.detachIfCurrent(tabId, from);
	}

	shownPlacement(): PagePlacement | undefined {
		return this.shownCard.current()?.placement.current();
	}

	containerOf(page: string): HTMLElement | null {
		const inPane = this.inPanes.containerOf(page);

		if (inPane !== null || this.shown !== page) {
			return inPane;
		}

		return this.shownCard.current()?.container ?? null;
	}

	drawnPages(): readonly string[] {
		const shown = this.drawnPage();
		const inPanes = this.inPanes.drawnIds();
		return shown === null || inPanes.includes(shown) ? inPanes : [shown, ...inPanes];
	}

	sync(): void {
		this.nativePages.follow(this.drawnPage());
	}

	private createShownCard(): ShownCard {
		return new ShownCard({
			bridge: this.ports.bridge,
			drawnPage: () => this.drawnPage(),
			placeAt: (placement) => this.place(placement),
			sync: () => this.sync(),
			checkInPageNavigation: () => this.checkInPageNavigation(),
		});
	}

	private createPanePages(): PanePages {
		return new PanePages({
			bridge: this.ports.bridge,
			drawnIn: (attached, tabId) => this.drawnIn(attached, tabId),
			placeTab: (tabId, placement) => this.placeTab(tabId, placement),
			sync: () => this.sync(),
		});
	}

	private createNativePages(): NativePages {
		return new NativePages({
			bridge: this.ports.bridge,
			inPanes: this.inPanes,
			looks: this.looks,
			attached: () => this.shownCard.current(),
		});
	}

	private place(placement: PagePlacement): void {
		if (this.shown === null || this.inPanes.has(this.shown)) {
			this.sync();
			return;
		}

		this.placeTab(this.shown, placement);
	}

	private placeTab(page: string, placement: PagePlacement): void {
		if (!this.ports.isInOwnWindow(page)) {
			void this.ports.bridge.place(page, placement).catch((failure: unknown) => {
				console.error("[widgetarium] the browser page could not follow its card", failure);
			});
		}

		this.sync();
	}

	private drawnPage(): string | null {
		const shown = this.shown;

		if (shown === null || this.inPanes.has(shown)) {
			return null;
		}

		return this.drawnIn(this.shownCard.current(), shown);
	}

	private drawnIn(attached: Attached | null, tabId: string): string | null {
		const page = this.ports.heldPages.heldPageOf(tabId);
		const isHidden = document.visibilityState !== "visible";

		if (attached === null || this.ports.isInOwnWindow(tabId) || page?.isDrawn() !== true || isHidden) {
			return null;
		}

		return isLaidOnScreen(attached.container) ? tabId : null;
	}

	private checkInPageNavigation(): void {
		const drawn = this.drawnPage();

		if (drawn !== null) {
			this.ports.heldPages.heldPageOf(drawn)?.checkInPageNavigation();
		}
	}
}
