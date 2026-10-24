import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { AskInkButton } from "../../../../shared/ui/page-state/ask-ink-button.js";
import { PrimaryAction } from "../../../../shared/ui/page-state/primary-action.js";
import { AskInkCommand, ReloadPageCommand } from "../../contract.js";
import { StateActions } from "./state-actions.js";

export interface RetryActionsProps {
	readonly tabId: string;
	readonly canAskInk: boolean;
}

const TRY_AGAIN = "Try again";
const ASK_INK = "Ask Ink";

export function RetryActions({ tabId, canAskInk }: RetryActionsProps): ReactElement {
	const reload = useCommand(ReloadPageCommand);
	const askInk = useCommand(AskInkCommand);
	return (
		<StateActions>
			<PrimaryAction icon="rotate-cw" label={TRY_AGAIN} onPress={() => void reload.run({ tabId })} />
			{canAskInk ? <AskInkButton label={ASK_INK} onPress={() => void askInk.run({ tabId })} /> : null}
		</StateActions>
	);
}
