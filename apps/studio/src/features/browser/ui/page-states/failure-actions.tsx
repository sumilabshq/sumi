import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BrowserTabState, PageFailure } from "@widgetarium/browser";
import { CertificateActions } from "./certificate-actions.js";
import { NotFoundActions } from "./not-found-actions.js";
import { RetryActions } from "./retry-actions.js";
import { SchemeActions } from "./scheme-actions.js";

export interface FailureActionsProps {
	readonly tab: BrowserTabState;
	readonly failure: PageFailure;
	readonly searchFor: (text: string) => ReactNode;
}

export function FailureActions({ tab, failure, searchFor }: FailureActionsProps): ReactElement {
	if (failure.kind === "not-found") {
		return <NotFoundActions tab={tab} failure={failure} searchFor={searchFor} />;
	}

	if (failure.kind === "certificate") {
		return <CertificateActions tabId={tab.id} failure={failure} />;
	}

	if (failure.kind === "scheme") {
		return <SchemeActions tabId={tab.id} failure={failure} />;
	}

	return <RetryActions tabId={tab.id} canAskInk={failure.kind !== "offline"} />;
}
