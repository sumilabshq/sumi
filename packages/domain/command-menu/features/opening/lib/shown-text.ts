import type { AppTabState } from "@widgetarium/app-host";
import { bareAddressOf } from "../../../shared/lib/address.js";
import type { Door } from "../../../shared/schema/command-menu.schema.js";

interface Filled {
	readonly door: Door;
	readonly text: string;
}

export function filledWithShown(tabs: readonly AppTabState[], shownName: string): Filled {
	const shown = tabs.find((tab) => tab.isShown);

	if (shown?.address) {
		return {
			door: "this-tab",
			text: bareAddressOf(shown.address),
		};
	}

	return {
		door: "anywhere",
		text: shown?.title ?? shownName,
	};
}
