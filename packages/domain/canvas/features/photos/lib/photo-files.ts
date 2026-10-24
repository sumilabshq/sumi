import { referenceFileOf } from "@widgetarium/core/app-design.js";

const PASTED_NAME = "pasted-{at}.png";

export function photoFilesOf(photos: readonly File[], stamp: string): string[] {
	return photos.map((photo, at) =>
		referenceFileOf(photo.name || PASTED_NAME.replace("{at}", String(at)), `${stamp}${at}`),
	);
}
