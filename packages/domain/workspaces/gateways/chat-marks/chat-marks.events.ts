import { event, gatewayEvent } from "@widgetarium/core/requests";
import { ChatMarksGateway } from "./chat-marks.gateway.js";

export const ChatMarksChangedEvent = event("chat-marks-changed").from(
	gatewayEvent(ChatMarksGateway, (gateway, fire) => gateway.chatMarksChanged(fire)),
);
