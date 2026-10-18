import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BrowserTabState, PageFailure } from "../../../../shared/schema/browser-tab.schema.js";
import { failureCopyOf } from "../../lib/failure-copy.js";
import { FailureActions } from "./failure-actions.js";
import { StateCard } from "./state-card.js";

export interface FailurePageProps {
	readonly tab: BrowserTabState;
	readonly failure: PageFailure;
	readonly searchFor: (text: string) => ReactNode;
}

export function FailurePage({ tab, failure, searchFor }: FailurePageProps): ReactElement {
	const copy = failureCopyOf(failure.kind, failure.address);
	return (
		<StateCard mood={copy.mood} title={copy.title} reason={copy.reason}>
			<FailureActions tab={tab} failure={failure} searchFor={searchFor} />
		</StateCard>
	);
}
