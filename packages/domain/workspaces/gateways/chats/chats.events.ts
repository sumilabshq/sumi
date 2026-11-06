import { event, gatewayEvent } from "@widgetarium/framework";
import { ChatsGateway } from "./chats.gateway.js";

export const ChatsChangedEvent = event("chats-changed").from(
	gatewayEvent(ChatsGateway, (gateway, fire) => gateway.chatsChanged(fire)),
);
