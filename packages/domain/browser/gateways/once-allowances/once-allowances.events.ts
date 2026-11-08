import { event, gatewayEvent } from "@widgetarium/data-framework";
import { OnceAllowancesGateway } from "./once-allowances.gateway.js";

export const onceAllowancesChanged = event().from(
	gatewayEvent(OnceAllowancesGateway, (gateway, fire) => gateway.onceAllowancesChanged(fire)),
);
