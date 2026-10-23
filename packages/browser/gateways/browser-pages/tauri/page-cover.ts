import type { PagesBridge } from "./pages-bridge.js";

const OVERLAYS = [
	'[role="menu"]',
	'[role="tooltip"]',
	'[role="dialog"]',
	'[role="listbox"]',
	"[data-radix-popper-content-wrapper]",
	".wg-kit-portal-layer > *",
	".wg-portal:not(.wg-kit-portal-layer)",
	"[data-browser-page-area] > :not([data-browser-pages])",
].join(", ");
const WATCHED_CHANGES: MutationObserverInit = {
	childList: true,
	subtree: true,
	attributes: true,
	attributeFilter: ["class", "style", "hidden", "open", "data-state"],
};
const SNAPSHOT_FORMAT = "jpeg";
const SNAPSHOT_TYPE = "image/jpeg";

export interface PageCoverHold {
	readonly container: HTMLElement;
	readonly bridge: PagesBridge;
	readonly drawnPage: () => string | null;
}

export class PageCover {
	private isCovered = false;
	private turn = 0;
	private framePending = false;
	private picture: HTMLImageElement | null = null;
	private isFollowing = false;
	private readonly watched: MutationObserver;
	private readonly container: HTMLElement;
	private readonly bridge: PagesBridge;
	private readonly drawnPage: () => string | null;

	constructor({ container, bridge, drawnPage }: PageCoverHold) {
		this.container = container;
		this.bridge = bridge;
		this.drawnPage = drawnPage;
		this.watched = new MutationObserver(this.recheckSoon);
	}

	follow(isDrawn: boolean): void {
		if (isDrawn === this.isFollowing) {
			return;
		}

		this.isFollowing = isDrawn;
		this.recheckSoon();

		if (!isDrawn) {
			this.watched.disconnect();
			return;
		}

		this.watched.observe(document.body, WATCHED_CHANGES);
	}

	covers(): boolean {
		return this.isCovered;
	}

	stop(): void {
		this.watched.disconnect();
		this.isFollowing = false;
		this.turn += 1;
		this.dropPicture();

		if (this.isCovered) {
			this.isCovered = false;
			void this.bridge.cover(false).catch((failure: unknown) => {
				console.error("[widgetarium] the browser page could not come back after its card left", failure);
			});
		}
	}

	private dropPicture(): void {
		if (this.picture !== null) {
			URL.revokeObjectURL(this.picture.src);
			this.picture.remove();
		}

		this.picture = null;
	}

	readonly recheckSoon = (): void => {
		if (this.framePending) {
			return;
		}

		this.framePending = true;
		requestAnimationFrame(() => {
			this.framePending = false;
			this.recheck();
		});
	};

	private recheck(): void {
		const page = this.drawnPage();
		const isWanted = page !== null && this.hasOverlay();

		if (isWanted === this.isCovered) {
			return;
		}

		this.isCovered = isWanted;
		void (page !== null && isWanted ? this.cover(page) : this.uncover()).catch((failure: unknown) => {
			console.error("[widgetarium] the browser page could not step aside for an overlay", failure);
			return this.isCovered ? this.bridge.cover(true) : undefined;
		});
	}

	private hasOverlay(): boolean {
		const area = this.container.getBoundingClientRect();
		const candidates = Array.from(document.querySelectorAll(OVERLAYS));

		return candidates.some(
			(element) => !this.container.contains(element) && isVisible(element) && isOver(element, area),
		);
	}

	private async cover(page: string): Promise<void> {
		const turn = ++this.turn;
		const started = performance.now();
		const jpeg = await this.bridge.snapshot(page, null, SNAPSHOT_FORMAT);

		if (turn !== this.turn) {
			return;
		}

		const picture = this.picture ?? pictureFor(this.container);
		URL.revokeObjectURL(picture.src);
		picture.src = URL.createObjectURL(new Blob([jpeg.slice()], { type: SNAPSHOT_TYPE }));
		picture.style.removeProperty("display");
		this.picture = picture;
		await picture.decode();

		if (turn !== this.turn) {
			return;
		}

		await this.bridge.cover(true);
		console.info(`[widgetarium] browser page ${page} shown → picture (${Math.round(performance.now() - started)} ms)`);
	}

	private async uncover(): Promise<void> {
		const turn = ++this.turn;
		await this.bridge.cover(false);

		requestAnimationFrame(() => {
			if (turn !== this.turn || this.picture === null) {
				return;
			}

			this.picture.style.setProperty("display", "none");
		});
	}
}

function isVisible(element: Element): boolean {
	const box = element.getBoundingClientRect();

	if (box.width === 0 || box.height === 0) {
		return false;
	}

	const look = getComputedStyle(element);

	return look.visibility !== "hidden" && look.display !== "none" && look.opacity !== "0";
}

function isOver(element: Element, area: DOMRect): boolean {
	const box = element.getBoundingClientRect();

	return box.right > area.left && box.left < area.right && box.bottom > area.top && box.top < area.bottom;
}

function pictureFor(container: HTMLElement): HTMLImageElement {
	const picture = document.createElement("img");
	picture.alt = "";
	picture.dataset["browserPageCover"] = "";
	picture.style.setProperty("position", "absolute");
	picture.style.setProperty("inset", "0");
	picture.style.setProperty("width", "100%");
	picture.style.setProperty("height", "100%");
	picture.style.setProperty("pointer-events", "none");
	container.append(picture);
	return picture;
}
