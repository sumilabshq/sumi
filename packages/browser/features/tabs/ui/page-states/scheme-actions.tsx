import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PrimaryAction } from "../../../../shared/ui/page-state/primary-action.js";
import { QuietAction } from "../../../../shared/ui/page-state/quiet-action.js";
import type { PageFailure } from "../../../../shared/schema/browser-tab.schema.js";
import { LeaveFailureCommand } from "../../contract.js";
import { StateActions } from "./state-actions.js";

export interface SchemeActionsProps {
	readonly tabId: string;
	readonly failure: PageFailure;
}

const GO_BACK = "Go back";
const COPY_LINK = "Copy link";

export function SchemeActions({ tabId, failure }: SchemeActionsProps): ReactElement {
	const leave = useCommand(LeaveFailureCommand);
	return (
		<StateActions>
			<PrimaryAction icon="arrow-left" label={GO_BACK} onPress={() => void leave.run({ tabId })} />
			<QuietAction icon="link" label={COPY_LINK} onPress={() => copyAddress(failure.address)} />
		</StateActions>
	);
}

function copyAddress(address: string): void {
	navigator.clipboard.writeText(address).catch((failure: unknown) => {
		console.error("[widgetarium] the browser could not copy the refused address", failure);
	});
}
