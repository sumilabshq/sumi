import { chatTabs } from "@sumi/chat-tabs/contract";
import { assistant } from "@widgetarium/assistant/contract";
import { useCommand } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { installSkill } from "./install-skill.js";

const NEW_PLUGIN_TITLE = "New plugin";
const SKILL_DRAFT = "/build-sumi-plugin ";

export function useBuildsPlugin(windowApp: Runtime): () => void {
	const adopt = useCommand(assistant.composer.adoptDraft);
	return () => {
		void installSkill(windowApp).then((failure) => {
			if (failure !== null) {
				console.error(
					`[widgetarium] settings could not put the build skill in place, /build-sumi-plugin will be missing: ${failure}`,
				);
			}
		});
		void windowApp.send(chatTabs.chatOpening.openNew, { title: NEW_PLUGIN_TITLE }).then((opened) => {
			if (!opened.ok) {
				console.error(`[widgetarium] settings could not open a chat to build a plugin: ${opened.reason}`);
				return;
			}

			void adopt.run({ chat: opened.output.id, said: SKILL_DRAFT, attachments: [], sends: false });
		});
	};
}
