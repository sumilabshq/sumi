import { query, subscriber } from "#module";
import { pageLooksChanged, pagesChanged } from "../../gateways/browser-pages/browser-pages.events.js";
import { BrowserViewSchema } from "../../shared/schema/browser-tab.schema.js";
import { PageHeadSchema } from "../../shared/schema/page-look.schema.js";
import { pageHeadOf } from "./lib/page-head.js";

export const pageHead = query()
	.public()
	.input(BrowserViewSchema)
	.output(PageHeadSchema.nullable())
	.settlesNow()
	.handle(({ heldTabId }, { browserPages }) => {
		const shownId = heldTabId ?? browserPages.shownId();
		const shown = browserPages.tabs().find((tab) => tab.id === shownId);

		if (shown === undefined) {
			return null;
		}

		return pageHeadOf(shown, browserPages.look(shown.id));
	});

export const rereadPageHeadForPages = subscriber(pagesChanged).handle((_input, { invalidate }) => {
	invalidate(pageHead);
});

export const rereadPageHead = subscriber(pageLooksChanged).handle((_input, { invalidate }) => {
	invalidate(pageHead);
});
