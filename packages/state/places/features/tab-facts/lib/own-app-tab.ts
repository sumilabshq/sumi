import { holdsTabs } from "../../../shared/lib/tabs/app-abilities.js";
import { canStep } from "../../../shared/lib/tabs/tab-history.js";
import type { PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import type { OwnAppTab } from "../../../shared/schema/tab-facts.schema.js";

type KeptTab = PlacedTabs["tabs"][number];

export function ownAppTabOf(tab: KeptTab): OwnAppTab {
	return {
		id: tab.id,
		app: tab.app,
		address: tab.lastAddress,
		title: tab.lastTitle ?? tab.title,
		chatId: holdsTabs(tab) ? tab.id : null,
		canGoBack: canStep(tab, "back"),
		canGoForward: canStep(tab, "forward"),
	};
}
