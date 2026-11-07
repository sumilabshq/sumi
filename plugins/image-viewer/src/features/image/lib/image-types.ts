export const IMAGE_TYPES: Readonly<Record<string, string>> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	svg: "image/svg+xml",
	bmp: "image/bmp",
	ico: "image/x-icon",
};

const FALLBACK_TYPE = "application/octet-stream";

export function imageSourceOf(path: string, base64: string): string {
	const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
	return `data:${IMAGE_TYPES[extension] ?? FALLBACK_TYPE};base64,${base64}`;
}
