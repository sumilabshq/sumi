import { handler } from "@widgetarium/core/requests";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import { AssistantClientModule } from "../../module.js";
import { ChatQuery, RetryTurnCommand, StopTurnCommand } from "./contract.js";
import { chatOf } from "./lib/chat-of.js";

export const ChatQueryHandler = handler(ChatQuery, AssistantClientModule)
	.inject({
		assistantSessionGateway: AssistantSessionGateway,
		sentAttachmentsStore: SentAttachmentsStore,
	})
	.watch((_input, { assistantSessionGateway, sentAttachmentsStore }, changed) => {
		const stopSession = assistantSessionGateway.watch(changed);
		const stopSent = sentAttachmentsStore.watch(changed);
		return () => {
			stopSession();
			stopSent();
		};
	})
	.handle((_input, { assistantSessionGateway, sentAttachmentsStore }) =>
		chatOf(assistantSessionGateway, sentAttachmentsStore.now().previews),
	);

export const RetryTurnCommandHandler = handler(RetryTurnCommand, AssistantClientModule)
	.inject({ assistantSessionGateway: AssistantSessionGateway })
	.handle((_input, { assistantSessionGateway }) => assistantSessionGateway.retry());

export const StopTurnCommandHandler = handler(StopTurnCommand, AssistantClientModule)
	.inject({ assistantSessionGateway: AssistantSessionGateway })
	.handle((_input, { assistantSessionGateway }) => assistantSessionGateway.stop());
