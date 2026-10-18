import type { BrowserTab } from "../schema/browser-tab.schema.js";
import { urlOf } from "./site-key.js";

const FIND_A_PAGE = "Find a page for me";
const FIND_THE_SITE = "Find the site I meant by {host}";
const WHY_NOT_LOADING = "Why won't {host} load?";

export function askInkPromptOf(tab: BrowserTab): string {
	if (tab.failure === null) {
		return FIND_A_PAGE;
	}

	const host = urlOf(tab.failure.address)?.hostname || tab.failure.address;

	return (tab.failure.kind === "not-found" ? FIND_THE_SITE : WHY_NOT_LOADING).replace("{host}", host);
}
