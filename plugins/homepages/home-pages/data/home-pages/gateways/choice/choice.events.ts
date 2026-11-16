import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ChoiceGateway } from "./choice.gateway.js";

export const choiceChanged = event().from(gatewayEvent(ChoiceGateway, (gateway, fire) => gateway.choiceChanged(fire)));
