import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ChatsGateway } from "./chats.gateway.js";

export const ChatsChangedEvent = event("chats-changed").public().from(
	gatewayEvent(ChatsGateway, (gateway, fire) => gateway.chatsChanged(fire)),
);
