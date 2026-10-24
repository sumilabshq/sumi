import { handler } from "@widgetarium/core/requests";
import { BrowserPagesGateway } from "../../gateways/browser-pages/browser-pages.gateway.js";
import { pageHeadOf } from "../../shared/lib/page-head.js";
import { BrowserClientModule } from "../../module.js";
import { PageHeadQuery } from "./contract.js";

export const PageHeadQueryHandler = handler(PageHeadQuery, BrowserClientModule)
	.inject({ browserPagesGateway: BrowserPagesGateway })
	.watch((_input, { browserPagesGateway }, changed) => {
		const stops = [browserPagesGateway.watch(changed), browserPagesGateway.watchLook(changed)];
		return () => stops.forEach((stop) => stop());
	})
	.handle((_input, { browserPagesGateway }) => {
		const shownId = browserPagesGateway.shownId();
		const shown = browserPagesGateway.tabs().find((tab) => tab.id === shownId);

		if (shown === undefined) {
			return null;
		}

		return pageHeadOf(shown, browserPagesGateway.look(shown.id));
	});
