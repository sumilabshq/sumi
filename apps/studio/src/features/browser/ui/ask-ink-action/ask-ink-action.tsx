import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AskInkPromptQuery } from "@widgetarium/browser";
import { useQuery } from "@widgetarium/core/requests";
import { useAskComposer } from "../../../command-menu/lib/ask-composer-context.js";
import { AskInkButton } from "../page-state/ask-ink-button.js";

export interface AskInkActionProps {
	readonly tabId: string;
	readonly label: string;
}

export function AskInkAction({ tabId, label }: AskInkActionProps): ReactElement {
	const prompt = useQuery(AskInkPromptQuery, { tabId }).data;
	const askComposer = useAskComposer();
	return <AskInkButton label={label} onPress={() => askComposer.ask(prompt, false, null)} />;
}
