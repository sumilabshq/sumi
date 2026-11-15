import type { SentPictures } from "@widgetarium/core/engine/assistant-port.js";

interface KeptPath {
	readonly path: string;
}

interface MovedPath {
	readonly from: string;
	readonly to: string;
}

export function picturesOfKeptFiles(
	pictures: SentPictures | undefined,
	kept: readonly KeptPath[],
): SentPictures | undefined {
	if (pictures === undefined) {
		return undefined;
	}

	return Object.fromEntries(Object.entries(pictures).filter(([path]) => kept.some((file) => file.path === path)));
}

export function picturesAtMovedPaths(
	pictures: SentPictures | undefined,
	moved: readonly MovedPath[],
): SentPictures | undefined {
	if (pictures === undefined) {
		return undefined;
	}

	return Object.fromEntries(
		Object.entries(pictures).map(([path, preview]) => [moved.find(({ from }) => from === path)?.to ?? path, preview]),
	);
}
