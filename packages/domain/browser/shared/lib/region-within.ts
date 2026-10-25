import type { PageRegion } from "../schema/page-read.schema.js";

const OUTSIDE_THE_PAGE = "the asked region lies outside the page on screen";
const OUTSIDE_THE_DOCUMENT = "the asked region lies outside the page, which is {width}×{height} px";
const TOO_BIG = "a shot of {width}×{height} px is too big; ask for regions of at most {most} px a side";
const MOST_SHOT_SIDE = 8000;

export interface ViewportSize {
	readonly width: number;
	readonly height: number;
}

export function regionWithin(region: PageRegion, viewport: ViewportSize): PageRegion | null {
	const x = Math.min(region.x, viewport.width);
	const y = Math.min(region.y, viewport.height);
	const width = Math.min(region.width, viewport.width - x);
	const height = Math.min(region.height, viewport.height - y);

	if (width < 1 || height < 1) {
		return null;
	}

	return {
		x,
		y,
		width,
		height,
	};
}

export function regionOnScreen(region: PageRegion | null, viewport: ViewportSize | undefined): PageRegion | null {
	if (region === null) {
		return null;
	}

	const clamped = viewport ? regionWithin(region, viewport) : null;

	if (clamped === null) {
		throw new Error(OUTSIDE_THE_PAGE);
	}

	return clamped;
}

export function regionOnPage(region: PageRegion | null, page: ViewportSize): PageRegion {
	const whole = {
		x: 0,
		y: 0,
		width: page.width,
		height: page.height,
	};
	const clamped = regionWithin(region ?? whole, page);

	if (clamped === null) {
		throw new Error(
			OUTSIDE_THE_DOCUMENT.replace("{width}", String(page.width)).replace("{height}", String(page.height)),
		);
	}

	refuseTooBig(clamped);
	return clamped;
}

function refuseTooBig({ width, height }: PageRegion): void {
	if (width <= MOST_SHOT_SIDE && height <= MOST_SHOT_SIDE) {
		return;
	}

	throw new Error(
		TOO_BIG.replace("{width}", String(width))
			.replace("{height}", String(height))
			.replace("{most}", String(MOST_SHOT_SIDE)),
	);
}
