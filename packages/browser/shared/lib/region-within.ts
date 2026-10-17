import type { PageRegion } from "../schema/page-read.schema.js";

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
