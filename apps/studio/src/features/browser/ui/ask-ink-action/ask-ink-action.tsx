import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AskInkPromptQuery } from "@widgetarium/browser";
import { useQuery } from "@widgetarium/core/requests";
import { useAskInk } from "../../../command-menu/lib/ask-ink-context.js";
import { AskInkButton } from "../page-state/ask-ink-button.js";

export interface AskInkActionProps {
	readonly tabId: string;
	readonly label: string;
}

export function AskInkAction({ tabId, label }: AskInkActionProps): ReactElement {
	const prompt = useQuery(AskInkPromptQuery, { tabId }).data;
	const askInk = useAskInk();
	return <AskInkButton label={label} onPress={() => askInk(prompt)} />;
}
