import { event, gatewayEvent } from "@widgetarium/data-framework";
import { CanvasesGateway } from "./canvases.gateway.js";

export const canvasesChanged = event().from(
	gatewayEvent(CanvasesGateway, (gateway, fire) => gateway.canvasesChanged(fire)),
);
