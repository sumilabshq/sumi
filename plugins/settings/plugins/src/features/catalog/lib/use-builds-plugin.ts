import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { assistant } from "@widgetarium/assistant/contract";
import { useCommand } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { installSkill } from "./install-skill.js";

const NEW_PLUGIN_TITLE = "New plugin";
const SKILL_DRAFT = "/build-sumi-plugin ";

export function useBuildsPlugin(windowApp: Runtime, settingsTab: string | null): () => void {
	const adopt = useCommand(assistant.composer.adoptDraft);
	return () => {
		void installSkill(windowApp).then((failure) => {
			if (failure !== null) {
				console.error(
					`[widgetarium] settings could not put the build skill in place, /build-sumi-plugin will be missing: ${failure}`,
				);
			}
		});
		void openedChatBesides(windowApp, settingsTab).then((chat) => {
			if (chat === null) {
				return;
			}

			void adopt.run({ chat, said: SKILL_DRAFT, attachments: [], sends: false });
		});
	};
}

async function openedChatBesides(windowApp: Runtime, settingsTab: string | null): Promise<string | null> {
	const created = await windowApp.send(chatTabs.chatOpening.create, { title: NEW_PLUGIN_TITLE });

	if (!created.ok) {
		console.error(`[widgetarium] settings could not open a chat to build a plugin: ${created.reason}`);
		return null;
	}

	const { id } = created.output;

	if (settingsTab !== null) {
		const placed = await windowApp.send(appHost.tabs.placeTab, {
			id,
			to: { kind: "list", list: settingsTab, groupId: null, before: null },
		});

		if (!placed.ok) {
			console.error(`[widgetarium] settings could not place chat ${id} beside ${settingsTab}: ${placed.reason}`);
		}
	}

	const shown = await windowApp.send(appHost.tabs.showTab, { id });

	if (!shown.ok) {
		console.error(`[widgetarium] settings could not show chat ${id}: ${shown.reason}`);
	}

	return id;
}
