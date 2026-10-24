import { event, gatewayEvent } from "@widgetarium/core/requests";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

export const RecentSitesChangedEvent = event("recent-sites-changed").from(
	gatewayEvent(RecentSitesGateway, (gateway, fire) => gateway.recentSitesChanged(fire)),
);
