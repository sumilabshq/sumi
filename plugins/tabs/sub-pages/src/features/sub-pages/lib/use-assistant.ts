import { useCommand, useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { isChatTab, pageEntryOf } from "./page-entries.js";

export interface Assistant {
	readonly isOffered: boolean;
	readonly open: () => void;
}

export function useAssistant(pageId: string | null): Assistant {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const createChat = useCommand(chatTabs.chatOpening.create);
	const placeTab = useCommand(appHost.tabs.placeTab);
	const showTab = useCommand(appHost.tabs.showTab);
	const page = pageId === null ? null : pageEntryOf(sidebar, pageId);

	if (page === null || isChatTab(page.tab)) {
		return { isOffered: false, open: () => undefined };
	}

	const paired = page.subPages.find(({ tab }) => isChatTab(tab));
	return {
		isOffered: true,
		open: () => {
			if (paired !== undefined) {
				void showTab.run({ id: paired.tab.id });
				return;
			}

			void createChat.run({ title: null }).then(async (created) => {
				if (!created.ok) {
					console.warn(`[widgetarium] assistant for ${page.tab.id} refused: ${created.reason}`);
					return;
				}

				const placed = await placeTab.run({
					id: created.output.id,
					to: { kind: "list", list: page.tab.id, groupId: null, before: null },
				});

				if (!placed.ok) {
					console.warn(
						`[widgetarium] assistant chat ${created.output.id} under ${page.tab.id} refused: ${placed.reason}`,
					);
				}

				await showTab.run({ id: created.output.id });
			});
		},
	};
}
