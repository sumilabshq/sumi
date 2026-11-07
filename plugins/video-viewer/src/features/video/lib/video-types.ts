export const VIDEO_TYPES: Readonly<Record<string, string>> = {
	mp4: "video/mp4",
	m4v: "video/x-m4v",
	webm: "video/webm",
	mov: "video/quicktime",
	ogv: "video/ogg",
};

const FALLBACK_TYPE = "application/octet-stream";

// TRADE-OFF: the whole file as a data URL, capped at 16 MB by the file system; streaming needs an asset protocol
export function videoSourceOf(path: string, base64: string): string {
	const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
	return `data:${VIDEO_TYPES[extension] ?? FALLBACK_TYPE};base64,${base64}`;
}
