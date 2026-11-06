import { event, gatewayEvent } from "@widgetarium/framework";
import { OnceAllowancesGateway } from "./once-allowances.gateway.js";

export const OnceAllowancesChangedEvent = event("once-allowances-changed").from(
	gatewayEvent(OnceAllowancesGateway, (gateway, fire) => gateway.onceAllowancesChanged(fire)),
);
