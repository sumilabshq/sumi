import { terminal } from "@sumi/contract";
import { PerCall, refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { command } from "#module";
import { FoundPagesSchema, PageAskedSchema, PageSchema, SearchAskedSchema } from "../../shared/schema/web.schema.js";
import { SEARCH_ADDRESS, foundPagesOf } from "./lib/found-pages.js";
import { pageTextOf } from "./lib/page-text.js";

const PAGE_PART = 20000;
const BROWSER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Sumi";
const CURL_ARGS: readonly string[] = [
	"-sSL",
	"--compressed",
	"--max-time",
	"30",
	"--proto",
	"=http,https",
	"-A",
	BROWSER_AGENT,
];
const NOTHING_FOUND = "the search answered no results for {query}; try other words";

// TRADE-OFF: curl, not fetch: the window's fetch is refused by other sites' CORS
export const fetchPage = command()
	.public()
	.metadata({
		description:
			"Read a web page as plain text. A long page comes in parts of 20000 characters: pass from as the next of the last answer to read further.",
		mcp: { kind: "other", running: "Fetching", done: "Fetched", shows: "url" },
	})
	.input(PageAskedSchema)
	.output(PageSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ url, from }, { send }) => {
		const text = pageTextOf(await bodyOf(send, url));
		const start = from ?? 0;
		const end = start + PAGE_PART;
		return { url, text: text.slice(start, end), next: end < text.length ? end : null };
	});

// TODO: a search API through secrets; the DuckDuckGo page may change its markup
export const search = command()
	.public()
	.metadata({
		description:
			"Search the web: answers up to ten results, each with title, url and snippet. Read a result with agent-tools_web_fetch-page.",
		mcp: { kind: "other", running: "Searching the web for", done: "Searched the web for", shows: "query" },
	})
	.input(SearchAskedSchema)
	.output(FoundPagesSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ query: words }, { send }) => {
		const results = foundPagesOf(await bodyOf(send, `${SEARCH_ADDRESS}${encodeURIComponent(words)}`));

		if (results.length === 0) {
			return refuse(NOTHING_FOUND.replace("{query}", JSON.stringify(words)));
		}

		return { results };
	});

async function bodyOf(send: Send, url: string): Promise<string> {
	const fetched = await send(terminal.programs.run, { folder: "/", program: "curl", args: [...CURL_ARGS, "--", url] });

	if (fetched.code !== 0) {
		return refuse(fetched.err.trim() === "" ? `curl ended with ${String(fetched.code)}` : fetched.err.trim());
	}

	return fetched.out;
}
