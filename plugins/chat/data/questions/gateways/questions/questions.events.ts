import { event, gatewayEvent } from "@widgetarium/data-framework";
import { QuestionsGateway } from "./questions.gateway.js";

export const questionsChanged = event().from(
	gatewayEvent(QuestionsGateway, (gateway, fire) => gateway.questionsChanged(fire)),
);
