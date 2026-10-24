import type { BrowserTab } from "../schema/browser-tab.schema.js";
import type { PageHead, PageLook } from "../schema/page-look.schema.js";
import { urlOf } from "./site-key.js";

const NEW_TAB = "New tab";
const LEADING_WWW = /^www\./;

export function pageHeadOf(tab: BrowserTab, look: PageLook | null): PageHead {
	const site = siteOf(tab.url);
	return {
		tabId: tab.id,
		site: site ?? NEW_TAB,
		title: titleBeside(tab, site),
		canGoBack: tab.canGoBack,
		canGoForward: tab.canGoForward,
		look: tab.url === "" || tab.failure !== null ? null : look,
	};
}

function siteOf(address: string): string | null {
	if (address === "") {
		return null;
	}

	const host = urlOf(address)?.hostname ?? "";
	return host === "" ? address : host.replace(LEADING_WWW, "");
}

function titleBeside(tab: BrowserTab, site: string | null): string | null {
	const title = tab.title.trim();

	if (site === null || title === "" || title === tab.url || title === site) {
		return null;
	}

	return title;
}
