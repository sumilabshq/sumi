import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PrefillDraftCommand } from "@widgetarium/assistant";
import { useCommand } from "@widgetarium/core/requests";
import { AskInkButton } from "../page-state/ask-ink-button.js";

export interface PrefillChatProps {
	readonly prompt: string;
	readonly label: string;
}

export function PrefillChat({ prompt, label }: PrefillChatProps): ReactElement {
	const prefillDraft = useCommand(PrefillDraftCommand);
	return <AskInkButton label={label} onPress={() => void prefillDraft.run({ text: prompt })} />;
}
