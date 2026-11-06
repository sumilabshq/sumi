import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { ReloadPageCommand } from "@widgetarium/browser";
import { AskInkAction } from "../ask-ink-action/ask-ink-action.js";
import { PrimaryAction } from "../page-state/primary-action.js";
import { StateActions } from "./state-actions.js";

export interface RetryActionsProps {
	readonly tabId: string;
	readonly canAskInk: boolean;
}

const TRY_AGAIN = "Try again";
const ASK_INK = "Ask Sumi";

export function RetryActions({ tabId, canAskInk }: RetryActionsProps): ReactElement {
	const reload = useCommand(ReloadPageCommand);
	return (
		<StateActions>
			<PrimaryAction icon="rotate-cw" label={TRY_AGAIN} onPress={() => void reload.run({ tabId })} />
			{canAskInk ? <AskInkAction tabId={tabId} label={ASK_INK} /> : null}
		</StateActions>
	);
}
