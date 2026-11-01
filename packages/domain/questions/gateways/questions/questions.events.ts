import { event, gatewayEvent } from "@widgetarium/core/requests";
import { QuestionsGateway } from "./questions.gateway.js";

export const QuestionsChangedEvent = event("questions-changed").from(
	gatewayEvent(QuestionsGateway, (gateway, fire) => gateway.questionsChanged(fire)),
);
