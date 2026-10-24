import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PrimaryAction } from "../../../../shared/ui/page-state/primary-action.js";
import { QuietAction } from "../../../../shared/ui/page-state/quiet-action.js";
import type { PageFailure } from "../../../../shared/schema/browser-tab.schema.js";
import { LeaveFailureCommand } from "../../contract.js";
import { StateActions } from "./state-actions.js";

export interface CertificateActionsProps {
	readonly tabId: string;
	readonly failure: PageFailure;
}

const CODE = "cv:m-0 cv:mt-2 cv:font-mono cv:text-[12px] cv:text-muted-foreground";
const GO_BACK = "Go back";
const DETAILS = "Details";

export function CertificateActions({ tabId, failure }: CertificateActionsProps): ReactElement {
	const leave = useCommand(LeaveFailureCommand);
	const [isShowingDetails, setShowingDetails] = useState(false);
	return (
		<div>
			{isShowingDetails ? <p className={CODE}>{failure.code}</p> : null}
			<StateActions>
				<PrimaryAction icon="arrow-left" label={GO_BACK} onPress={() => void leave.run({ tabId })} />
				<QuietAction label={DETAILS} onPress={() => setShowingDetails(!isShowingDetails)} />
			</StateActions>
		</div>
	);
}
