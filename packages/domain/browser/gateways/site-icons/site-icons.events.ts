import { event, gatewayEvent } from "@widgetarium/core/requests";
import { SiteOriginSchema } from "../../shared/schema/site-icon.schema.js";
import { SiteIconsGateway } from "./site-icons.gateway.js";

export const SiteIconChangedEvent = event("site-icon-changed")
	.input(SiteOriginSchema)
	.from(gatewayEvent(SiteIconsGateway, (gateway, fire) => gateway.siteIconChanged((origin) => fire({ origin }))));
