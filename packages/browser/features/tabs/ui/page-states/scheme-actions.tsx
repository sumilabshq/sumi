import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PrimaryAction } from "../../../../shared/ui/page-state/primary-action.js";
import type { PageFailure } from "../../../../shared/schema/browser-tab.schema.js";
import { LeaveFailureCommand } from "../../contract.js";
import { CopyLinkAction } from "./copy-link-action.js";
import { StateActions } from "./state-actions.js";

export interface SchemeActionsProps {
	readonly tabId: string;
	readonly failure: PageFailure;
}

const GO_BACK = "Go back";

export function SchemeActions({ tabId, failure }: SchemeActionsProps): ReactElement {
	const leave = useCommand(LeaveFailureCommand);
	return (
		<StateActions>
			<PrimaryAction icon="arrow-left" label={GO_BACK} onPress={() => void leave.run({ tabId })} />
			<CopyLinkAction address={failure.address} />
		</StateActions>
	);
}
