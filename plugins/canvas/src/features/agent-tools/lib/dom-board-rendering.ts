import type { BoardRendering, DrawnBoard, Shot } from "@sumi/canvas-work/implementation";
import { findElementAtPath, layersOf, parseHtmlDocument, serializeDocument } from "../../../shared/lib/layers-of.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const PNG_PREFIX = "data:image/png;base64,";

interface Bounds {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export const domBoardRendering: BoardRendering = {
	shotOf: renderShot,
	layersOf,
	withLayerName: (html, path, name) => {
		const document = parseHtmlDocument(html);
		const element = findElementAtPath(document, path);

		if (element === null) {
			return null;
		}

		element.setAttribute("data-name", name);
		return serializeDocument(document, html);
	},
};

// TRADE-OFF: drawn through an SVG foreignObject, so scripts do not run and web fonts fall back; a native webview shot would need a hidden browser page
async function renderShot(boards: readonly DrawnBoard[], maxSide: number): Promise<Shot> {
	const bounds = boundsOf(boards);
	const scale = Math.min(1, maxSide / Math.max(bounds.width, bounds.height));
	const canvasElement = createShotCanvas(bounds, scale);
	const canvasContext = canvasElement.getContext("2d");

	if (canvasContext === null) {
		throw new Error("the canvas shot found no 2d context in this window");
	}

	for (const board of boards) {
		const at = placeOf(board, bounds, scale);
		canvasContext.drawImage(await loadBoardImage(board), at.left, at.top, at.width, at.height);
	}

	return {
		png: canvasElement.toDataURL("image/png").slice(PNG_PREFIX.length),
		width: canvasElement.width,
		height: canvasElement.height,
	};
}

function createShotCanvas(bounds: Bounds, scale: number): HTMLCanvasElement {
	const canvasElement = document.createElement("canvas");
	canvasElement.width = Math.round(bounds.width * scale);
	canvasElement.height = Math.round(bounds.height * scale);
	return canvasElement;
}

function boundsOf(boards: readonly DrawnBoard[]): Bounds {
	const left = Math.min(...boards.map(({ x }) => x));
	const top = Math.min(...boards.map(({ y }) => y));
	return {
		left,
		top,
		width: Math.max(...boards.map(({ x, w }) => x + w)) - left,
		height: Math.max(...boards.map(({ y, h }) => y + h)) - top,
	};
}

function placeOf(board: DrawnBoard, bounds: Bounds, scale: number): Bounds {
	return {
		left: (board.x - bounds.left) * scale,
		top: (board.y - bounds.top) * scale,
		width: board.w * scale,
		height: board.h * scale,
	};
}

async function loadBoardImage(board: DrawnBoard): Promise<HTMLImageElement> {
	const picture = new Image(board.w, board.h);
	picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildBoardSvg(board))}`;
	await picture.decode();
	return picture;
}

function buildBoardSvg({ html, w, h }: DrawnBoard): string {
	const page = parseHtmlDocument(html);
	page.documentElement.setAttribute("style", `width:${w}px;height:${h}px;overflow:hidden`);
	page.body.style.setProperty("box-sizing", "border-box");
	page.body.style.setProperty("min-height", `${h}px`);
	const serialized = new XMLSerializer().serializeToString(page.documentElement);
	return `<svg xmlns="${SVG_NS}" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
}
