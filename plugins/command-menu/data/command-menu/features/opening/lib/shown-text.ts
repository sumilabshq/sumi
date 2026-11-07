import type { AppTabState } from "@widgetarium/app-host";
import { linkOf } from "@widgetarium/core/engine/sumi-link.js";
import { bareAddressOf } from "../../../shared/lib/address.js";
import type { Door } from "../../../shared/schema/command-menu.schema.js";

interface Filled {
	readonly door: Door;
	readonly text: string;
}

const WEB_PAGE_APP_IDS: ReadonlySet<string> = new Set(["browser", "browser-page"]);

export function filledWithShown(tabs: readonly AppTabState[], shownName: string, tabId: string | null): Filled {
	const shown = tabs.find((tab) => (tabId === null ? tab.isShown : tab.id === tabId));

	if (shown === undefined) {
		return filledOf("anywhere", shownName);
	}

	if (!WEB_PAGE_APP_IDS.has(shown.app)) {
		return filledOf("this-tab", linkOf({ kind: "page", app: shown.app, address: shown.address ?? "" }));
	}

	return shown.address ? filledOf("this-tab", bareAddressOf(shown.address)) : filledOf("anywhere", shown.title);
}

function filledOf(door: Door, text: string): Filled {
	return {
		door,
		text,
	};
}
