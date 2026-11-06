import { query, subscriber } from "@widgetarium/data-framework";
import { PageLooksChangedEvent, PagesChangedEvent } from "../../gateways/browser-pages/browser-pages.events.js";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { BrowserViewSchema } from "../../shared/schema/browser-tab.schema.js";
import { PageHeadSchema } from "../../shared/schema/page-look.schema.js";
import { pageHeadOf } from "./lib/page-head.js";

export const PageHeadQuery = query("page-head")
	.input(BrowserViewSchema)
	.output(PageHeadSchema.nullable())
	.settlesNow()
	.inject({ browserPages: BrowserPagesGateway })
	.handle(({ heldTabId }, { browserPages }) => {
		const shownId = heldTabId ?? browserPages.shownId();
		const shown = browserPages.tabs().find((tab) => tab.id === shownId);

		if (shown === undefined) {
			return null;
		}

		return pageHeadOf(shown, browserPages.look(shown.id));
	});

export const RereadPageHeadForPagesSubscriber = subscriber(PagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PageHeadQuery);
});

export const RereadPageHeadSubscriber = subscriber(PageLooksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PageHeadQuery);
});
