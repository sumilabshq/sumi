import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useRuntime } from "@widgetarium/data-framework";
import { AssistantPanel } from "../../../assistant/ui/assistant-panel/assistant-panel.js";
import { useOpensChatDraft } from "../../lib/use-opens-chat-draft.js";

export function ChatOf({ chatId }: { readonly chatId: string }): ReactElement {
	useOpensChatDraft(useRuntime("ChatOf"), chatId);
	return <AssistantPanel chatId={chatId} />;
}
