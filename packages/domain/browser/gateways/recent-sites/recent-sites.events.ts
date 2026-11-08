import { event, gatewayEvent } from "@widgetarium/data-framework";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

export const recentSitesChanged = event().from(
	gatewayEvent(RecentSitesGateway, (gateway, fire) => gateway.recentSitesChanged(fire)),
);
