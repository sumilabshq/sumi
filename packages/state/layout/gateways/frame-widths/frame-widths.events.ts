import { event, gatewayEvent } from "@widgetarium/data-framework";
import { FrameWidthsGateway } from "./frame-widths.gateway.js";

export const FrameWidthsChangedEvent = event("frame-widths-changed").from(
	gatewayEvent(FrameWidthsGateway, (gateway, fire) => gateway.widthsChanged(fire)),
);
