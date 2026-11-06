import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppProvider } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { AssistantPanel } from "./features/assistant/ui/assistant-panel/assistant-panel.js";
import { useOpensChatDraft } from "./use-opens-chat-draft.js";

export function ChatOf({ chatId, shell }: { readonly chatId: string; readonly shell: StartedApp }): ReactElement {
	useOpensChatDraft(shell, chatId);
	return (
		<AppProvider app={shell}>
			<AssistantPanel chatId={chatId} />
		</AppProvider>
	);
}
