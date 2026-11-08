import { event, gatewayEvent } from "@widgetarium/data-framework";
import { MomentFieldsSchema } from "../../shared/schema/canvas-moment.schema.js";
import { CanvasMomentGateway } from "./canvas-moment.gateway.js";

export const momentChanged = event()
	.input(MomentFieldsSchema)
	.from(gatewayEvent(CanvasMomentGateway, (gateway, fire) => gateway.momentChanged((fields) => fire({ fields }))));
