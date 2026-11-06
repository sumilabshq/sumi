import { event, gatewayEvent } from "@widgetarium/framework";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

export const RecentSitesChangedEvent = event("recent-sites-changed").from(
	gatewayEvent(RecentSitesGateway, (gateway, fire) => gateway.recentSitesChanged(fire)),
);
