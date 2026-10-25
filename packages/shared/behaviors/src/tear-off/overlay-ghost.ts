import { GRAB_MOTION } from "./drag-ghost.js";
import type { DragGhost, GhostRect } from "./drag-ghost.js";

export interface GhostPage {
	readonly htmlClass: string;
	readonly htmlAttributes: Array<[string, string]>;
	readonly bodyClass: string;
	readonly ghost: string;
}

export interface OverlayLay {
	readonly page: GhostPage;
	readonly width: number;
	readonly height: number;
	readonly anchorX: number;
	readonly anchorY: number;
}

export interface OverlayPort {
	readonly lay: (lay: OverlayLay) => Promise<boolean>;
	readonly wear: (worn: { styles: Record<string, string>; texts: Record<string, string> }) => void;
	readonly show: (shown: boolean) => void;
}

const MARGIN_PX = 48;
const THEME_ATTRIBUTES = ["data-theme", "data-mode", "style"];

export class OverlayGhost {
	private isLaid = false;
	private isShown = false;
	private isStopped = false;
	private readonly anchor: readonly [number, number];
	private readonly size: readonly [number, number];

	constructor(
		private readonly ghost: DragGhost,
		private readonly port: OverlayPort,
	) {
		const largest = ghost.largestSize();
		this.anchor = [largest.width + MARGIN_PX, largest.height + MARGIN_PX];
		this.size = [2 * this.anchor[0], 2 * this.anchor[1]];
	}

	async lay(): Promise<void> {
		const page = {
			htmlClass: document.documentElement.className,
			htmlAttributes: attributesOf(document.documentElement),
			bodyClass: document.body.className,
			ghost: this.ghost.markup(),
		};
		const isLaid = await this.port.lay({
			page,
			width: this.size[0],
			height: this.size[1],
			anchorX: this.anchor[0],
			anchorY: this.anchor[1],
		});

		if (!isLaid || this.isStopped) {
			return;
		}

		this.isLaid = true;
		this.sync();
	}

	isReady(): boolean {
		return this.isLaid;
	}

	sync(): void {
		if (!this.isLaid) {
			return;
		}

		const worn = this.ghost.worn();
		this.port.wear({
			styles: {
				...worn.styles,
				root: this.rootStyleOf(worn.styles["root"] ?? ""),
			},
			texts: { ...worn.texts },
		});
	}

	takesOver(rect: GhostRect): boolean {
		const isShown = this.isLaid && !isInsideWindow(rect);

		if (isShown !== this.isShown) {
			this.isShown = isShown;
			this.port.show(isShown);
		}

		return isShown;
	}

	stop(): void {
		this.isStopped = true;

		if (this.isShown) {
			this.isShown = false;
			this.port.show(false);
		}
	}

	private rootStyleOf(cssText: string): string {
		const probe = document.createElement("div");
		probe.style.cssText = cssText;
		const [grabX, grabY] = this.ghost.grabNow();
		probe.style.position = "absolute";
		probe.style.left = "0";
		probe.style.top = "0";
		probe.style.zIndex = "";
		probe.style.visibility = "visible";
		probe.style.transform = `translate(${this.anchor[0] - grabX}px, ${this.anchor[1] - grabY}px)`;
		probe.style.transition = `${probe.style.transition}, ${GRAB_MOTION}`;
		return probe.style.cssText;
	}
}

function isInsideWindow({ left, top, width, height }: GhostRect): boolean {
	return left >= 0 && top >= 0 && left + width <= window.innerWidth && top + height <= window.innerHeight;
}

function attributesOf(root: HTMLElement): Array<[string, string]> {
	return THEME_ATTRIBUTES.flatMap((name) => {
		const value = root.getAttribute(name);
		return value === null ? [] : [[name, value] as [string, string]];
	});
}
