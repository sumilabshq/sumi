import type { Rect } from "./sidebar-layout.js";

export type GhostShape = "row" | "tile" | "window";

const MOTION = "var(--sumi-dur-base) var(--sumi-ease-out)";
const SHAPE_MOTION = ["width", "height", "border-radius", "padding", "gap", "background-color"]
	.map((property) => `${property} ${MOTION}`)
	.join(", ");
const ROW_PAD_PX = 8;
const ROW_GAP_PX = 10;
const ROW_RADIUS_PX = 10;
const TILE_RADIUS_PX = 14;
const WINDOW_RADIUS_PX = 10;
const WINDOW_PAD_PX = 10;
const RELEASE_FOR_WINDOW = "Release to open in a new window";
const ART_GROWTH = 20 / 18;
const FALLBACK_ART_PX = 18;
const GHOST_STYLE: Partial<CSSStyleDeclaration> = {
	position: "fixed",
	left: "0",
	top: "0",
	zIndex: "2147483000",
	display: "flex",
	alignItems: "center",
	boxSizing: "border-box",
	overflow: "hidden",
	pointerEvents: "none",
	whiteSpace: "nowrap",
	font: "inherit",
	fontFamily: "var(--sumi-font-ui)",
	fontSize: "var(--sumi-fs-13)",
	fontWeight: "var(--sumi-fw-medium)",
	color: "var(--sumi-text)",
	boxShadow: "var(--sumi-shadow-pop)",
	willChange: "transform",
	transition: `transform 0ms, ${SHAPE_MOTION}`,
};
const WORDS_STYLE: Partial<CSSStyleDeclaration> = {
	minWidth: "0",
	overflow: "hidden",
	textOverflow: "ellipsis",
	transition: `opacity ${MOTION}, max-width ${MOTION}`,
};
const HIDDEN_WORDS: Partial<CSSStyleDeclaration> = {
	opacity: "0",
	maxWidth: "0px",
};

type GhostArt = HTMLElement | SVGElement;

export class DragGhost {
	readonly element: HTMLElement;
	private readonly words: HTMLElement;
	private readonly caption: HTMLElement;
	private readonly art: GhostArt | null;
	private readonly artPx: number;
	private readonly rowScale: number;
	private shape: GhostShape;
	private size: Rect;

	constructor(art: Element | null, title: string, from: Rect, shape: GhostShape) {
		this.art = art === null ? null : artCloneOf(art);
		this.artPx = art === null ? FALLBACK_ART_PX : art.getBoundingClientRect().width;
		this.rowScale = shape === "row" ? 1 : 1 / ART_GROWTH;
		this.words = wordsOf(title);
		this.caption = captionOf();
		this.element = ghostElementOf(this.art, this.words);
		this.element.prepend(this.caption);
		this.shape = shape;
		this.size = from;
		this.paint(shape, from);
		this.place(from.left, from.top);
		document.body.append(this.element);
	}

	morph(shape: GhostShape, size: Rect): void {
		if (shape === this.shape && size.width === this.size.width) {
			return;
		}

		this.shape = shape;
		this.size = size;
		this.paint(shape, size);
	}

	place(left: number, top: number): void {
		this.element.style.transform = `translate3d(${left}px, ${top}px, 0)`;
	}

	land(rect: Rect, shape: GhostShape): void {
		this.element.style.transition = `transform ${MOTION}, ${SHAPE_MOTION}, box-shadow ${MOTION}`;
		this.element.style.boxShadow = "none";
		this.morph(shape, rect);
		this.place(rect.left, rect.top);
	}

	remove(): void {
		this.element.remove();
	}

	private paint(shape: GhostShape, size: Rect): void {
		this.caption.style.display = shape === "window" ? "block" : "none";

		if (shape === "window") {
			Object.assign(this.element.style, windowStyleOf(size));
			Object.assign(this.words.style, shownWordsOf(size));
			this.scaleArt(1);
			return;
		}

		const isTile = shape === "tile";
		const scale = this.rowScale * (isTile ? ART_GROWTH : 1);
		Object.assign(this.element.style, isTile ? tileStyleOf(size, this.artPx * scale) : rowStyleOf(size));
		Object.assign(this.words.style, isTile ? HIDDEN_WORDS : shownWordsOf(size));
		this.scaleArt(scale);
	}

	private scaleArt(scale: number): void {
		if (this.art === null) {
			return;
		}

		this.art.style.transform = scale === 1 ? "" : `scale(${scale})`;
	}
}

function ghostElementOf(art: GhostArt | null, words: HTMLElement): HTMLElement {
	const element = document.createElement("div");
	element.setAttribute("aria-hidden", "true");
	element.dataset["tabsGhost"] = "";
	Object.assign(element.style, GHOST_STYLE);

	if (art !== null) {
		element.append(art);
	}

	element.append(words);
	return element;
}

function wordsOf(title: string): HTMLElement {
	const words = document.createElement("span");
	words.textContent = title;
	Object.assign(words.style, WORDS_STYLE);
	return words;
}

function artCloneOf(art: Element): GhostArt | null {
	const copy = art.cloneNode(true);

	if (!(copy instanceof HTMLElement || copy instanceof SVGElement)) {
		return null;
	}

	copy.style.flex = "none";
	copy.style.transition = `transform ${MOTION}`;
	return copy;
}

function captionOf(): HTMLElement {
	const caption = document.createElement("span");
	caption.textContent = RELEASE_FOR_WINDOW;
	caption.dataset["tabsGhostCaption"] = "";
	Object.assign(caption.style, {
		position: "absolute",
		left: "50%",
		top: "calc(100% + 8px)",
		transform: "translateX(-50%)",
		display: "none",
		padding: "6px 10px",
		borderRadius: "9px",
		whiteSpace: "nowrap",
		fontSize: "var(--sumi-fs-12)",
		fontWeight: "var(--sumi-fw-regular)",
		color: "var(--sumi-text-2)",
		background: "var(--sumi-overlay)",
		boxShadow: "var(--sumi-shadow-pop)",
	});
	return caption;
}

function windowStyleOf(size: Rect): Partial<CSSStyleDeclaration> {
	return {
		width: `${size.width}px`,
		height: `${size.height}px`,
		borderRadius: `${WINDOW_RADIUS_PX}px`,
		padding: `${WINDOW_PAD_PX}px`,
		gap: `${ROW_GAP_PX}px`,
		alignItems: "flex-start",
		overflow: "visible",
		background: "var(--sumi-plate)",
	};
}

function tileStyleOf(size: Rect, artWidth: number): Partial<CSSStyleDeclaration> {
	return {
		width: `${size.width}px`,
		height: `${size.height}px`,
		borderRadius: `${TILE_RADIUS_PX}px`,
		padding: `0 0 0 ${Math.max(0, (size.width - artWidth) / 2)}px`,
		gap: "0px",
		background: "color-mix(in srgb, var(--sumi-text) 9%, var(--sumi-frame))",
		alignItems: "center",
		overflow: "hidden",
	};
}

function rowStyleOf(size: Rect): Partial<CSSStyleDeclaration> {
	return {
		width: `${size.width}px`,
		height: `${size.height}px`,
		borderRadius: `${ROW_RADIUS_PX}px`,
		padding: `0 ${ROW_PAD_PX}px`,
		gap: `${ROW_GAP_PX}px`,
		background: "var(--sumi-selected)",
		alignItems: "center",
		overflow: "hidden",
	};
}

function shownWordsOf(size: Rect): Partial<CSSStyleDeclaration> {
	return {
		opacity: "1",
		maxWidth: `${size.width}px`,
	};
}
