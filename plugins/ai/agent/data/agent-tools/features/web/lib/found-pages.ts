import type { FoundPage } from "../../../shared/schema/web.schema.js";
import { pageTextOf } from "./page-text.js";

const RESULT =
	/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
const REDIRECT_TARGET = "uddg";
const MOST_RESULTS = 10;

export const SEARCH_ADDRESS = "https://html.duckduckgo.com/html/?q=";

export function foundPagesOf(html: string): FoundPage[] {
	return [...html.matchAll(RESULT)].slice(0, MOST_RESULTS).map(([, href = "", title = "", snippet = ""]) => ({
		title: pageTextOf(`<p>${title}</p>`),
		url: targetOf(href),
		snippet: pageTextOf(`<p>${snippet}</p>`),
	}));
}

function targetOf(href: string): string {
	const address = new URL(href.replaceAll("&amp;", "&"), "https://duckduckgo.com");
	return address.searchParams.get(REDIRECT_TARGET) ?? address.href;
}
