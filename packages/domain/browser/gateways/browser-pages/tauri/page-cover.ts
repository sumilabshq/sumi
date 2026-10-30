import { listenToCarry } from "@widgetarium/behaviors";
import type { PageHole, PagesBridge } from "./pages-bridge.js";

const OVERLAYS = [
	'[role="menu"]',
	'[role="tooltip"]',
	'[role="dialog"]',
	'[role="listbox"]',
	"[data-radix-popper-content-wrapper]",
	".wg-kit-portal-layer > *",
	".wg-portal:not(.wg-kit-portal-layer)",
	"[data-browser-page-area] > :not([data-browser-pages])",
	"[data-covers-pages]",
].join(", ");
const WATCHED_CHANGES: MutationObserverInit = {
	childList: true,
	subtree: true,
	attributes: true,
	attributeFilter: ["class", "style", "hidden", "open", "data-state"],
};
const CAPTURED = true;
const DRAG_ENDS = ["dragend", "drop", "pointermove"] as const;
const LIVE = "data-browser-pages-live";
const SHELL = ".wg-shell";
const FRAME_TOKEN = "var(--sumi-frame)";
const NO_HOLES = "[]";
const NO_HOLES_SENT = "";

export interface PageCoverHold {
	readonly container: HTMLElement;
	readonly bridge: PagesBridge;
	readonly drawnPage: () => string | null;
}

export class PageCover {
	private holedPage: string | null = null;
	private holesSaid = NO_HOLES;
	private frameSaid: string | null = null;
	private framePending = false;
	private isFollowing = false;
	private isDragging = false;
	private isCarrying = false;
	private readonly stopHearingCarry: () => void;
	private readonly watched: MutationObserver;
	private readonly container: HTMLElement;
	private readonly bridge: PagesBridge;
	private readonly drawnPage: () => string | null;

	constructor({ container, bridge, drawnPage }: PageCoverHold) {
		this.container = container;
		this.bridge = bridge;
		this.drawnPage = drawnPage;
		this.watched = new MutationObserver(this.recheckSoon);
		document.addEventListener("dragstart", this.onDragStart, CAPTURED);
		this.stopHearingCarry = listenToCarry(({ phase }) => {
			const isCarrying = phase === "over";

			if (isCarrying !== this.isCarrying) {
				this.isCarrying = isCarrying;
				this.recheckSoon();
			}

			return false;
		});
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

		this.watched.observe(document.documentElement, WATCHED_CHANGES);
	}

	stop(): void {
		document.removeEventListener("dragstart", this.onDragStart, CAPTURED);
		this.stopHearingCarry();
		this.isCarrying = false;
		this.stopWatchingDragEnd();
		this.watched.disconnect();
		this.isFollowing = false;
		this.container.removeAttribute(LIVE);
		this.cutHoles(null, []);
	}

	private readonly onDragStart = (): void => {
		this.isDragging = true;
		DRAG_ENDS.forEach((kind) => document.addEventListener(kind, this.onDragEnd, CAPTURED));
		this.recheckSoon();
	};

	private readonly onDragEnd = (): void => {
		this.isDragging = false;
		this.stopWatchingDragEnd();
		this.recheckSoon();
	};

	private stopWatchingDragEnd(): void {
		DRAG_ENDS.forEach((kind) => document.removeEventListener(kind, this.onDragEnd, CAPTURED));
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
		this.container.toggleAttribute(LIVE, page !== null);

		if (page === null) {
			this.cutHoles(null, []);
			return;
		}

		this.wearFrame();
		this.cutHoles(page, this.studioAreas());
	}

	private studioAreas(): readonly Element[] {
		if (this.isDragging || this.isCarrying) {
			return [this.container];
		}

		const area = this.container.getBoundingClientRect();
		const candidates = Array.from(document.querySelectorAll(OVERLAYS));

		return candidates.filter(
			(element) => !this.container.contains(element) && isVisible(element) && isOver(element, area),
		);
	}

	private wearFrame(): void {
		const shell = this.container.closest(SHELL);
		const colour = shell === null ? null : hexOf(shell, FRAME_TOKEN);

		if (colour === null || colour === this.frameSaid) {
			return;
		}

		console.info(
			`[widgetarium] browser studio frame ${this.frameSaid ?? "none"} → ${colour} (pages show under the studio)`,
		);
		setTimeout(() => {
			const painted: string[] = [];
			for (let at: Element | null = this.container; at !== null; at = at.parentElement) {
				const look = getComputedStyle(at);
				painted.push(`${describedElement(at).slice(0, 90)} bg=${look.backgroundColor}`);
			}
			const box = this.container.getBoundingClientRect();
			const stacked = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2).map((at) => {
				const look = getComputedStyle(at);
				return `${describedElement(at).slice(0, 80)} bg=${look.backgroundColor} shadow=${look.boxShadow.slice(0, 50)} opacity=${look.opacity}`;
			});
			console.info(
				`[widgetarium] PAINTPROBE ${this.drawnPage() ?? "none"} at ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)}\n${painted.join("\n")}\nSTACKED\n${stacked.join("\n")}`,
			);
		}, 1500);
		this.frameSaid = colour;
		void this.bridge.wearFrame(colour).catch((failure: unknown) => {
			console.error("[widgetarium] the studio frame colour did not reach the window", failure);
			this.frameSaid = null;
		});
	}

	private cutHoles(page: string | null, areas: readonly Element[]): void {
		const box = this.container.getBoundingClientRect();
		const holes = areas.map((area) => holeOf(area, box));
		const said = JSON.stringify(holes);
		const was = this.holedPage;

		if (page === was && said === this.holesSaid) {
			return;
		}

		console.info(
			`[widgetarium] browser studio areas over ${was ?? "none"} → ${page ?? "none"}: ${areas.map(describedElement).join(", ") || "none"}`,
		);
		this.holedPage = page;
		this.holesSaid = said;

		if (was !== null && was !== page) {
			void this.bridge.cut(was, []).catch(sayAreasFailed);
		}

		if (page !== null) {
			void this.bridge.cut(page, holes).catch((failure: unknown) => {
				sayAreasFailed(failure);
				this.holesSaid = NO_HOLES_SENT;
			});
		}
	}
}

function holeOf(overlay: Element, area: DOMRect): PageHole {
	const box = overlay.getBoundingClientRect();

	return {
		x: box.left - area.left,
		y: box.top - area.top,
		width: box.width,
		height: box.height,
	};
}

function hexOf(within: Element, colour: string): string | null {
	const probe = document.createElement("span");
	probe.style.setProperty("display", "none");
	probe.style.setProperty("color", colour);
	within.append(probe);
	const resolved = getComputedStyle(probe).color;
	probe.remove();
	const paint = document.createElement("canvas").getContext("2d");

	if (paint === null || resolved === "") {
		return null;
	}

	paint.fillStyle = resolved;
	paint.fillRect(0, 0, 1, 1);
	const [red = 0, green = 0, blue = 0] = paint.getImageData(0, 0, 1, 1).data;
	return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function sayAreasFailed(failure: unknown): void {
	console.error("[widgetarium] the browser page did not hear which areas the studio draws over it", failure);
}

function describedElement(element: Element): string {
	const marks = Array.from(element.attributes)
		.filter(({ name }) => name === "role" || name === "class" || name.startsWith("data-"))
		.map(({ name, value }) => `${name}="${value.slice(0, 60)}"`);

	return `<${element.tagName.toLowerCase()} ${marks.join(" ")}>`;
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
