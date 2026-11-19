import { chatIdOf } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTab } from "../../../shared/lib/tabs/host-tabs.js";
import { subPageIdsOf } from "../../../shared/lib/tabs/sub-pages.js";
import type { TabLayout } from "../../../shared/lib/tabs/tab-lists.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";
import type { AppTabInChat, TabsOfApp } from "../../../shared/schema/tab-facts.schema.js";

type TabChat = NonNullable<AppTabInChat["chat"]>;

interface LaidTabs extends TabLayout {
	readonly tabs: readonly Pick<HostTab, "id" | "app" | "lastAddress" | "label" | "title">[];
}

export function appTabsInChatsOf(placed: LaidTabs, apps: PlacedApps, app: string): TabsOfApp {
	const chatHolding = chatHoldingOf(placed, apps);
	return {
		tabs: placed.tabs
			.filter((tab) => tab.app === app)
			.map((tab) => ({
				id: tab.id,
				address: tab.lastAddress,
				chat: chatHolding.get(tab.id) ?? null,
			})),
	};
}

function chatHoldingOf(placed: LaidTabs, apps: PlacedApps): ReadonlyMap<string, TabChat> {
	return new Map(
		placed.tabs.flatMap((holder) => {
			const chatId = chatIdOf(apps, holder);

			if (chatId === null) {
				return [];
			}

			const chat = {
				id: chatId,
				title: holder.label ?? holder.title,
			};
			return subPageIdsOf(placed, holder.id).map((id) => [id, chat] as const);
		}),
	);
}
