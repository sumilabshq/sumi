import { createElement as h } from "react";
import type { ReactElement } from "react";
import { browser } from "@widgetarium/browser/contract";
import { useQuery } from "@widgetarium/data-framework";
import { useAskComposer } from "@sumi/sumi-host-plugin";
import { AskInkButton } from "../page-state/ask-ink-button.js";

export interface AskInkActionProps {
	readonly tabId: string;
	readonly label: string;
}

export function AskInkAction({ tabId, label }: AskInkActionProps): ReactElement {
	const prompt = useQuery(browser.tabs.askInkPrompt, { tabId }).data;
	const askComposer = useAskComposer();
	return <AskInkButton label={label} onPress={() => askComposer.ask(prompt, false, null)} />;
}
