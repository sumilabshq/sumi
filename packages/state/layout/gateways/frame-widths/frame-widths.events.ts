import { event, gatewayEvent } from "@widgetarium/data-framework";
import { FrameWidthsGateway } from "./frame-widths.gateway.js";

export const widthsChanged = event().from(
	gatewayEvent(FrameWidthsGateway, (gateway, fire) => gateway.widthsChanged(fire)),
);
