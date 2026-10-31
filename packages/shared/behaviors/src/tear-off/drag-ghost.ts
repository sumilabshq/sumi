import { FollowingGhost } from "../held-drag/following-ghost.js";

export type GhostShape = "row" | "tile" | "card";

export interface GhostSize {
	readonly width: number;
	readonly height: number;
}

export interface GhostFace {
	readonly art: Element | null;
	readonly title: string;
	readonly grabOffset: readonly [number, number];
	readonly contentStart: number;
}

export type ListSizes = Readonly<Record<Exclude<GhostShape, "card">, GhostSize>>;

export interface GhostAsk extends GhostFace {
	readonly shape: GhostShape;
	readonly sizes: ListSizes;
}

export interface GhostRect {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export interface WornGhost {
	readonly styles: Readonly<Record<string, string>>;
	readonly texts: Readonly<Record<string, string>>;
}

export const CARD_SIZE: GhostSize = {
	width: 208,
	height: 156,
};

const CARD_BAR_PX = 26;
const CARD_FOOTER_PX = 30;
const CARD_RADIUS_PX = 10;
const CARD_GRAB: readonly [number, number] = [CARD_SIZE.width / 2, CARD_BAR_PX / 2];
const PAD_PX = 8;
const ROW_GAP_PX = 10;
const CARD_GAP_PX = 6;
const ROW_RADIUS_PX = 10;
const TILE_RADIUS_PX = 14;
const CONTENT_RADIUS_PX = 6;
const CARD_ART_SCALE = 0.75;
const PART = "ghostPart";
const FADE_MS = 200;
const SHAPE_MOTION = [
	"width",
	"height",
	"border-radius",
	"padding",
	"gap",
	"margin",
	"background-color",
	"box-shadow",
	"font-size",
	"color",
	"opacity",
]
	.map(motionOf)
	.join(", ");
export const GRAB_MOTION = motionOf("transform");
const ROOT_STYLE: Partial<CSSStyleDeclaration> = {
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	whiteSpace: "nowrap",
	fontFamily: "var(--sumi-font-ui)",
	fontWeight: "var(--sumi-fw-medium)",
	color: "var(--sumi-text)",
	transition: SHAPE_MOTION,
};
const HEAD_STYLE: Partial<CSSStyleDeclaration> = {
	display: "flex",
	alignItems: "center",
	flex: "none",
	minWidth: "0",
	transition: SHAPE_MOTION,
};
const CONTENT_STYLE: Partial<CSSStyleDeclaration> = {
	flex: "1 1 0",
	minHeight: "0",
	borderRadius: `${CONTENT_RADIUS_PX}px`,
	background: "color-mix(in srgb, var(--sumi-text) 4%, transparent)",
	transition: SHAPE_MOTION,
};
const FOOTER_STYLE: Partial<CSSStyleDeclaration> = {
	flex: "none",
	display: "flex",
	alignItems: "center",
	overflow: "hidden",
	textOverflow: "ellipsis",
	padding: `0 ${PAD_PX}px`,
	fontSize: "var(--sumi-fs-11)",
	fontWeight: "var(--sumi-fw-regular)",
	color: "var(--sumi-text-2)",
	transition: SHAPE_MOTION,
};
const WORDS_STYLE: Partial<CSSStyleDeclaration> = {
	minWidth: "0",
	overflow: "hidden",
	textOverflow: "ellipsis",
};

export class DragGhost {
	private readonly element: HTMLElement;
	private readonly head: HTMLElement;
	private readonly art: HTMLElement | SVGElement | null;
	private readonly words: HTMLElement;
	private readonly content: HTMLElement;
	private readonly footer: HTMLElement;
	private readonly following: FollowingGhost;
	private shape: GhostShape;
	private grab: readonly [number, number];
	private contentStart: number;

	constructor(private readonly ask: GhostAsk) {
		this.words = partOf(document.createElement("span"), "words", WORDS_STYLE);
		this.words.textContent = ask.title;
		this.art = artCopyOf(ask.art);
		this.head = partOf(document.createElement("div"), "head", HEAD_STYLE);
		this.head.append(...[this.art, this.words].filter((part) => part !== null));
		this.content = partOf(document.createElement("div"), "content", CONTENT_STYLE);
		this.footer = partOf(document.createElement("div"), "footer", FOOTER_STYLE);
		this.element = partOf(document.createElement("div"), "root", ROOT_STYLE);
		this.element.append(this.head, this.content, this.footer);
		this.grab = ask.grabOffset;
		this.contentStart = ask.contentStart;
		this.following = new FollowingGhost(this.element, ask.grabOffset);
		this.shape = ask.shape;
		this.paintShape();
	}

	follow(x: number, y: number, isNudgedInside: boolean): void {
		if (!isNudgedInside) {
			this.following.follow(x, y);
			return;
		}

		const { left, top, width, height } = this.rectAt(x, y);
		const dx = Math.max(0, -left) - Math.max(0, left + width - window.innerWidth);
		const dy = Math.max(0, -top) - Math.max(0, top + height - window.innerHeight);
		this.following.follow(x + dx, y + dy);
	}

	wear(shape: GhostShape): boolean {
		if (shape === this.shape) {
			return false;
		}

		this.shape = shape;
		this.grab = grabOf(shape, this.sizeOf(shape));
		this.paintShape();
		this.following.grabAt(this.grab);
		return true;
	}

	land(rect: GhostRect, contentStart: number): void {
		this.contentStart = contentStart;
		this.head.style.paddingInlineStart = `${contentStart}px`;
		this.element.style.transition = `${SHAPE_MOTION}, ${GRAB_MOTION}`;
		this.element.style.width = `${rect.width}px`;
		this.element.style.height = `${rect.height}px`;
		this.element.style.boxShadow = "none";
		this.following.landAt(rect.left, rect.top);
	}

	say(caption: string): boolean {
		if (this.footer.textContent === caption) {
			return false;
		}

		this.footer.textContent = caption;
		return true;
	}

	show(isShown: boolean): void {
		this.element.style.visibility = isShown ? "visible" : "hidden";
	}

	remove(): void {
		this.following.remove();
	}

	fadeAway(): void {
		this.element.style.opacity = "0";
		setTimeout(() => this.following.remove(), FADE_MS);
	}

	rectAt(x: number, y: number): GhostRect {
		return {
			left: x - this.grab[0],
			top: y - this.grab[1],
			...this.sizeOf(this.shape),
		};
	}

	grabNow(): readonly [number, number] {
		return this.grab;
	}

	markup(): string {
		return this.element.outerHTML;
	}

	worn(): WornGhost {
		const parts = [
			this.element,
			this.head,
			this.content,
			this.footer,
			this.words,
			...(this.art === null ? [] : [this.art]),
		];
		return {
			styles: Object.fromEntries(parts.map((part) => [part.dataset[PART] ?? "", part.style.cssText])),
			texts: {
				footer: this.footer.textContent ?? "",
			},
		};
	}

	largestSize(): GhostSize {
		const sizes = [CARD_SIZE, this.ask.sizes.row, this.ask.sizes.tile];
		return {
			width: Math.max(...sizes.map((size) => size.width)),
			height: Math.max(...sizes.map((size) => size.height)),
		};
	}

	private sizeOf(shape: GhostShape): GhostSize {
		return shape === "card" ? CARD_SIZE : this.ask.sizes[shape];
	}

	private paintShape(): void {
		const { shape } = this;
		const isCard = shape === "card";
		this.element.dataset["dragGhost"] = shape;
		this.words.style.display = shape === "tile" ? "none" : "";
		Object.assign(this.element.style, rootStyleOf(shape, this.sizeOf(shape)));
		Object.assign(this.head.style, headStyleOf(shape, this.contentStart));
		this.content.style.opacity = isCard ? "1" : "0";
		this.content.style.margin = isCard ? `0 ${PAD_PX}px` : "0";
		this.footer.style.height = isCard ? `${CARD_FOOTER_PX}px` : "0";
		this.footer.style.opacity = isCard ? "1" : "0";

		if (this.art !== null) {
			this.art.style.transform = isCard ? `scale(${CARD_ART_SCALE})` : "none";
		}
	}
}

function motionOf(property: string): string {
	return `${property} var(--sumi-dur-base) var(--sumi-ease-out)`;
}

function partOf<Part extends HTMLElement>(element: Part, name: string, style: Partial<CSSStyleDeclaration>): Part {
	element.dataset[PART] = name;
	Object.assign(element.style, style);
	return element;
}

function grabOf(shape: GhostShape, { width, height }: GhostSize): readonly [number, number] {
	return shape === "card" ? CARD_GRAB : [width / 2, height / 2];
}

function artCopyOf(art: Element | null): HTMLElement | SVGElement | null {
	const copy = art?.cloneNode(true);

	if (!(copy instanceof HTMLElement) && !(copy instanceof SVGElement)) {
		return null;
	}

	copy.dataset[PART] = "art";
	copy.style.flex = "none";
	copy.style.transition = `${SHAPE_MOTION}, ${GRAB_MOTION}`;
	return copy;
}

function rootStyleOf(shape: GhostShape, { width, height }: GhostSize): Partial<CSSStyleDeclaration> {
	const size = {
		width: `${width}px`,
		height: `${height}px`,
	};

	if (shape === "card") {
		return {
			...size,
			borderRadius: `${CARD_RADIUS_PX}px`,
			background: "var(--sumi-plate)",
			boxShadow: "var(--sumi-shadow-lift)",
		};
	}

	if (shape === "tile") {
		return {
			...size,
			borderRadius: `${TILE_RADIUS_PX}px`,
			background: "color-mix(in srgb, var(--sumi-text) 9%, var(--sumi-frame))",
			boxShadow: "var(--sumi-shadow-pop)",
		};
	}

	return {
		...size,
		borderRadius: `${ROW_RADIUS_PX}px`,
		background: "var(--sumi-selected)",
		boxShadow: "var(--sumi-shadow-pop)",
	};
}

function headStyleOf(shape: GhostShape, contentStart: number): Partial<CSSStyleDeclaration> {
	if (shape === "card") {
		return {
			height: `${CARD_BAR_PX}px`,
			padding: `0 ${PAD_PX}px`,
			gap: `${CARD_GAP_PX}px`,
			justifyContent: "flex-start",
			fontSize: "var(--sumi-fs-11)",
			color: "var(--sumi-text-2)",
		};
	}

	return {
		height: "100%",
		padding: shape === "tile" ? "0" : `0 ${PAD_PX}px 0 ${contentStart}px`,
		gap: shape === "tile" ? "0" : `${ROW_GAP_PX}px`,
		justifyContent: shape === "tile" ? "center" : "flex-start",
		fontSize: "var(--sumi-fs-13)",
		color: "var(--sumi-text)",
	};
}
