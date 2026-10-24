import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AskInkPromptQuery } from "@widgetarium/browser";
import { AppProvider, useQuery } from "@widgetarium/core/requests";
import { useChatBeside } from "../../lib/chat-beside.js";
import { AskInkButton } from "../page-state/ask-ink-button.js";
import { PrefillChat } from "./prefill-chat.js";

export interface AskInkActionProps {
	readonly tabId: string;
	readonly label: string;
}

const NO_CHAT = "[widgetarium] no chat stands beside this browser to take the draft";

export function AskInkAction({ tabId, label }: AskInkActionProps): ReactElement {
	const prompt = useQuery(AskInkPromptQuery, { tabId }).data;
	const chatApp = useChatBeside();

	if (chatApp === null) {
		return <AskInkButton label={label} onPress={() => console.error(NO_CHAT)} />;
	}

	return (
		<AppProvider app={chatApp}>
			<PrefillChat prompt={prompt} label={label} />
		</AppProvider>
	);
}
