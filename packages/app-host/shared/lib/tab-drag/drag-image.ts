import type { Rect } from "./sidebar-layout.js";

export type DragImageShape = "row" | "tile" | "own-window";

export interface DragImageAsk {
	readonly art: Element | null;
	readonly title: string;
	readonly shape: DragImageShape;
	readonly from: Rect;
	readonly grab: readonly [number, number];
}

const ROW_PAD_PX = 8;
const IMAGE_GAP_PX = 10;
const ROW_RADIUS_PX = 10;
const TILE_RADIUS_PX = 14;
const OWN_WINDOW_WIDTH_PX = 208;
const OWN_WINDOW_HEIGHT_PX = 156;
const OWN_WINDOW_RADIUS_PX = 10;
const OWN_WINDOW_PAD_PX = 10;
const OWN_WINDOW_GRAB_TOP_PX = 20;
const RELEASE_FOR_OWN_WINDOW = "Release to open in a new window";
const IMAGE_STYLE: Partial<CSSStyleDeclaration> = {
	position: "fixed",
	left: "0",
	top: "0",
	zIndex: "-1",
	display: "flex",
	alignItems: "center",
	boxSizing: "border-box",
	overflow: "hidden",
	pointerEvents: "none",
	whiteSpace: "nowrap",
	fontFamily: "var(--sumi-font-ui)",
	fontSize: "var(--sumi-fs-13)",
	fontWeight: "var(--sumi-fw-medium)",
	color: "var(--sumi-text)",
};
const WORDS_STYLE: Partial<CSSStyleDeclaration> = {
	minWidth: "0",
	overflow: "hidden",
	textOverflow: "ellipsis",
};
const CAPTION_STYLE: Partial<CSSStyleDeclaration> = {
	position: "absolute",
	left: `${OWN_WINDOW_PAD_PX}px`,
	right: `${OWN_WINDOW_PAD_PX}px`,
	bottom: `${OWN_WINDOW_PAD_PX}px`,
	whiteSpace: "normal",
	fontSize: "var(--sumi-fs-12)",
	fontWeight: "var(--sumi-fw-regular)",
	color: "var(--sumi-text-3)",
};

const OWN_WINDOW_STYLE: Partial<CSSStyleDeclaration> = {
	width: `${OWN_WINDOW_WIDTH_PX}px`,
	height: `${OWN_WINDOW_HEIGHT_PX}px`,
	borderRadius: `${OWN_WINDOW_RADIUS_PX}px`,
	padding: `${OWN_WINDOW_PAD_PX}px`,
	gap: `${IMAGE_GAP_PX}px`,
	alignItems: "flex-start",
	background: "var(--sumi-plate)",
};

export function setTabDragImage(transfer: DataTransfer, ask: DragImageAsk): void {
	const image = dragImageOf(ask);
	document.body.append(image);
	const [x, y] = grabOnImageOf(ask);
	transfer.setDragImage(image, x, y);
	setTimeout(() => image.remove(), 0);
}

function grabOnImageOf({ shape, grab }: DragImageAsk): readonly [number, number] {
	if (shape !== "own-window") {
		return grab;
	}

	return [OWN_WINDOW_WIDTH_PX / 2, OWN_WINDOW_GRAB_TOP_PX];
}

function dragImageOf({ art, title, shape, from }: DragImageAsk): HTMLElement {
	const image = document.createElement("div");
	image.setAttribute("aria-hidden", "true");
	image.dataset["tabsDragImage"] = shape;
	Object.assign(image.style, IMAGE_STYLE, styleOf(shape, from));
	const copy = art?.cloneNode(true);

	if (copy instanceof HTMLElement || copy instanceof SVGElement) {
		copy.style.flex = "none";
		image.append(copy);
	}

	if (shape !== "tile") {
		image.append(wordsOf(title));
	}

	if (shape === "own-window") {
		image.append(captionOf());
	}

	return image;
}

function styleOf(shape: DragImageShape, from: Rect): Partial<CSSStyleDeclaration> {
	if (shape === "own-window") {
		return OWN_WINDOW_STYLE;
	}

	return shape === "tile" ? tileStyleOf(from) : rowStyleOf(from);
}

function wordsOf(title: string): HTMLElement {
	const words = document.createElement("span");
	words.textContent = title;
	Object.assign(words.style, WORDS_STYLE);
	return words;
}

function captionOf(): HTMLElement {
	const caption = document.createElement("span");
	caption.textContent = RELEASE_FOR_OWN_WINDOW;
	caption.dataset["tabsDragImageCaption"] = "";
	Object.assign(caption.style, CAPTION_STYLE);
	return caption;
}

function tileStyleOf(from: Rect): Partial<CSSStyleDeclaration> {
	return {
		width: `${from.width}px`,
		height: `${from.height}px`,
		borderRadius: `${TILE_RADIUS_PX}px`,
		justifyContent: "center",
		background: "color-mix(in srgb, var(--sumi-text) 9%, var(--sumi-frame))",
	};
}

function rowStyleOf(from: Rect): Partial<CSSStyleDeclaration> {
	return {
		width: `${from.width}px`,
		height: `${from.height}px`,
		borderRadius: `${ROW_RADIUS_PX}px`,
		padding: `0 ${ROW_PAD_PX}px`,
		gap: `${IMAGE_GAP_PX}px`,
		background: "var(--sumi-selected)",
	};
}
