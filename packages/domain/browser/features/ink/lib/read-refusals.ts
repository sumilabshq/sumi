import type { CommittedPage, PageContentRead } from "../../../shared/schema/page-read.schema.js";
import type { AskOutcome } from "../../../shared/schema/access-ask.schema.js";

export interface BrowserRead {
	readonly tabId: string;
	readonly siteKey: string;
	readonly kind: "content" | "screenshot";
	readonly page: CommittedPage;
}

export interface BrowserNavigation {
	readonly tabId: string;
	readonly url: string;
	readonly siteKey: string;
}

export const CHANGED_DURING_CAPTURE = "changed-during-capture";
export const SECRET_FIELD_ON_PAGE = "secret-field-on-page";

const REFUSAL_OF_OUTCOME: Readonly<Record<AskOutcome, string | null>> = {
	site: null,
	once: null,
	no: "person-said-no",
	unanswered: "ask-unanswered",
};

export function refusalOfOutcome(outcome: AskOutcome): string | null {
	return REFUSAL_OF_OUTCOME[outcome];
}

export function refuseReportedRead(read: BrowserRead, captured: PageContentRead): string | null {
	if (captured.url !== read.page.url) {
		return CHANGED_DURING_CAPTURE;
	}

	return captured.hasSecretField ? SECRET_FIELD_ON_PAGE : null;
}

export function isSamePage(read: BrowserRead, after: CommittedPage | null): boolean {
	return after !== null && after.entry === read.page.entry && after.url === read.page.url;
}
