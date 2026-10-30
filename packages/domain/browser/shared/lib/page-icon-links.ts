import type { IconLink } from "../schema/site-icon.schema.js";

export type MediaMatch = (media: string) => boolean;

export const DATA_IMAGE = "data:image/";
export const ICON_LINKS =
	'link[rel][href]:is([rel~="icon" i], [rel~="apple-touch-icon" i], [rel~="apple-touch-icon-precomposed" i])';
const MOST_LINKS = 64;

export function iconLinksOfHead(head: string, page: string, isMatching: MediaMatch): IconLink[] {
	const read = new DOMParser().parseFromString(head, "text/html");
	const base = absoluteOf(read.querySelector("base[href]")?.getAttribute("href") ?? "", page) ?? page;
	return [...read.querySelectorAll(ICON_LINKS)]
		.slice(0, MOST_LINKS)
		.map((link) => linkOf(link, base, isMatching))
		.filter((link) => link !== null);
}

function linkOf(link: Element, base: string, isMatching: MediaMatch): IconLink | null {
	const href = absoluteOf(link.getAttribute("href") ?? "", base);
	const media = link.getAttribute("media") ?? "";

	if (href === null) {
		return null;
	}

	return {
		href,
		rel: link.getAttribute("rel") ?? "",
		sizes: link.getAttribute("sizes") ?? "",
		type: (link.getAttribute("type") ?? "").toLowerCase(),
		isMatching: media === "" || isMatching(media),
	};
}

function absoluteOf(href: string, base: string): string | null {
	try {
		return new URL(href.trim(), base).href;
	} catch {
		return null;
	}
}
