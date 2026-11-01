import { Repeatable, command, deny, guard, query, subscriber } from "@widgetarium/core/requests";
import { AssistantSessionChangedEvent } from "../../gateways/assistant-session/assistant-session.events.js";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { SentAttachmentsGateway } from "../../gateways/sent-attachments/sent-attachments.gateway.js";
import { SentAttachmentsChangedEvent } from "../../shared/events/sent-attachments.events.js";
import { ChatSchema } from "../../shared/schema/chat.schema.js";
import { chatOf } from "./lib/chat-of.js";

const APP_CALLABLE: ReadonlySet<string> = new Set(
	[
		"chat",
		"retry-turn",
		"stop-turn",
		"send-message",
		"compact-chat",
		"clear-chat",
		"draft-attachments",
		"attach-files",
		"remove-attachment",
		"sweep-attachments",
		"attach-reach",
		"composer-prefill",
		"prefill-draft",
		"hold-draft-text",
		"open-chat-draft",
		"slash-commands",
		"agent-setup",
		"claude-options",
		"working-folders",
	].map((short) => `assistant/${short}`),
);
const NOT_FOR_APPS =
	"{request} is not open to apps: an app reaches only its own chat's conversation and reads the agent setup";

export const AssistantCallersGuard = guard().handle(({ request, context }) => {
	if (context.user !== null && !APP_CALLABLE.has(request)) {
		deny(NOT_FOR_APPS.replace("{request}", request));
	}
});

export const ChatQuery = query("chat")
	.output(ChatSchema)
	.settlesNow()
	.inject({
		assistantSession: AssistantSessionGateway,
		sentAttachments: SentAttachmentsGateway,
	})
	.handle((_input, { assistantSession, sentAttachments }) => {
		const session = assistantSession.session();
		return chatOf({
			isAvailable: assistantSession.isAvailable(),
			session,
			cards: assistantSession.cardsOf(session),
			faces: session.turns.map((turn) => turn.calls.map((call) => assistantSession.faceOf(call))),
			previews: sentAttachments.sentAttachments().previews,
		});
	});

export const RetryTurnCommand = command("retry-turn")
	.idempotencyKey(Repeatable)
	.inject({ assistantSession: AssistantSessionGateway })
	.handle((_input, { assistantSession }) => assistantSession.retry());

export const StopTurnCommand = command("stop-turn")
	.idempotencyKey(Repeatable)
	.inject({ assistantSession: AssistantSessionGateway })
	.handle((_input, { assistantSession }) => assistantSession.stop());

export const RereadChatSubscriber = subscriber(AssistantSessionChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatQuery);
});

export const RereadChatForAttachmentsSubscriber = subscriber(SentAttachmentsChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(ChatQuery);
	},
);
