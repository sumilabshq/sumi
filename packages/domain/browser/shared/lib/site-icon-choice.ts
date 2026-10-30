import type { IconLink, PageIconsRead } from "../schema/site-icon.schema.js";
import { urlOf } from "./site-key.js";

export const WANTED_ICON_PX = 32;
export const MOST_ICON_ADDRESSES = 4;

const FALLBACK_ICON = "/favicon.ico";
const WEB_PAGE = /^https?:$/;
const SIZE = /^(\d+)x(\d+)$/;
const SVG_PATH = /\.svg(?:[?#]|$)/i;
const SCALES = 10_000;
const UNKNOWN_SIZE_RANK = 5_000;
const IN_MEDIA = 2 * SCALES;

type IconKind = "icon" | "apple-touch" | null;

export function iconAddressesOf({ page, links }: PageIconsRead): readonly string[] {
	const pageUrl = urlOf(page);

	if (pageUrl === null || !WEB_PAGE.test(pageUrl.protocol)) {
		return [];
	}

	const usable = links.filter((link) => kindOf(link) !== null && isUsableHref(link.href));
	const icons = bestFirst(usable.filter((link) => kindOf(link) === "icon"));
	const touches = bestFirst(usable.filter((link) => kindOf(link) === "apple-touch"));
	const fallback = new URL(FALLBACK_ICON, pageUrl.origin).href;
	return [...new Set([...icons, fallback, ...touches])].slice(0, MOST_ICON_ADDRESSES);
}

function bestFirst(links: readonly IconLink[]): readonly string[] {
	return links
		.map((link) => ({ href: link.href, rank: sizeRankOf(link) + (link.isMatching ? IN_MEDIA : 0) }))
		.sort((one, other) => other.rank - one.rank)
		.map(({ href }) => href);
}

function kindOf({ rel }: IconLink): IconKind {
	const words = rel.toLowerCase().split(/\s+/);

	if (words.includes("icon")) {
		return "icon";
	}

	return words.includes("apple-touch-icon") || words.includes("apple-touch-icon-precomposed") ? "apple-touch" : null;
}

function isUsableHref(href: string): boolean {
	const url = urlOf(href);
	return url !== null && (WEB_PAGE.test(url.protocol) || href.startsWith("data:image/"));
}

function sizeRankOf({ sizes, type, href }: IconLink): number {
	if (sizes.toLowerCase().includes("any") || type.includes("svg") || SVG_PATH.test(href)) {
		return SCALES;
	}

	const largest = largestSideOf(sizes);

	if (largest === null) {
		return UNKNOWN_SIZE_RANK;
	}

	return largest >= WANTED_ICON_PX ? SCALES - largest : largest;
}

function largestSideOf(sizes: string): number | null {
	const sides = sizes
		.toLowerCase()
		.split(/\s+/)
		.map((size) => SIZE.exec(size))
		.filter((matched) => matched !== null)
		.map((matched) => Math.max(Number(matched[1]), Number(matched[2])));
	return sides.length === 0 ? null : Math.max(...sides);
}
