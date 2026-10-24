import { event, gatewayEvent } from "@widgetarium/core/requests";
import { MomentFieldsSchema } from "../../shared/schema/canvas-moment.schema.js";
import { CanvasMomentGateway } from "./canvas-moment.gateway.js";

export const CanvasMomentChangedEvent = event("canvas-moment-changed")
	.input(MomentFieldsSchema)
	.from(gatewayEvent(CanvasMomentGateway, (gateway, fire) => gateway.momentChanged((fields) => fire({ fields }))));
