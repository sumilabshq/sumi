import { rgbaOfCss } from "./gpu-tokens.js";
import type { Rgba } from "./gpu-tokens.js";

export type ColourReader = (css: string) => Rgba | null;

const OVER_BLACK = "#000000";
const OVER_WHITE = "#ffffff";

export function colourReaderOf(document: Document): ColourReader {
	const painter = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	return (css) => rgbaOfCss(css) ?? paintedRgbaOf(css, painter);
}

function paintedRgbaOf(css: string, painter: CanvasRenderingContext2D | null): Rgba | null {
	if (!painter || !isPaintable(css, painter)) {
		return null;
	}

	painter.clearRect(0, 0, 1, 1);
	painter.fillRect(0, 0, 1, 1);
	const [red = 0, green = 0, blue = 0, alpha = 0] = painter.getImageData(0, 0, 1, 1).data;
	return [red / 255, green / 255, blue / 255, alpha / 255];
}

function isPaintable(css: string, painter: CanvasRenderingContext2D): boolean {
	painter.fillStyle = OVER_BLACK;
	painter.fillStyle = css;
	const readOverBlack = painter.fillStyle;
	painter.fillStyle = OVER_WHITE;
	painter.fillStyle = css;
	return painter.fillStyle === readOverBlack;
}
