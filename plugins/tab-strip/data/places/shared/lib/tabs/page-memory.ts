import type { HostTab, HostTabsMoment } from "./host-tabs-moment.js";
import type { MovedTabs } from "./host-tabs.js";

const UNREMEMBERED_ADDRESSES: ReadonlySet<string> = new Set(["", "about:blank"]);

export interface RememberedPage {
	readonly pageId: string;
	readonly url: string;
	readonly title: string;
	readonly favicon: string | null;
}

export function rememberPages(moment: HostTabsMoment, pages: readonly RememberedPage[]): MovedTabs | null {
	const remembered = moment.tabs.map((tab) => withPageRemembered(tab, pages));
	const changed = remembered.filter((tab, at) => tab !== moment.tabs[at]);

	if (changed.length === 0) {
		return null;
	}

	return {
		moment: {
			...moment,
			tabs: remembered,
		},
		reason: `${changed.map((tab) => `${tab.id} → ${tab.lastAddress ?? "nowhere"}`).join(", ")}, remembered for the next start`,
	};
}

export function forgetPages(moment: HostTabsMoment): MovedTabs | null {
	if (moment.tabs.every((tab) => tab.pageId === null)) {
		return null;
	}

	return {
		moment: {
			...moment,
			tabs: moment.tabs.map((tab) => ({
				...tab,
				pageId: null,
			})),
		},
		reason: "pages do not outlive a start",
	};
}

function withPageRemembered(tab: HostTab, pages: readonly RememberedPage[]): HostTab {
	const page = pages.find((one) => one.pageId === tab.pageId);

	if (page === undefined || UNREMEMBERED_ADDRESSES.has(page.url) || page.url === tab.lastAddress) {
		return tab;
	}

	return {
		...tab,
		lastAddress: page.url,
	};
}
