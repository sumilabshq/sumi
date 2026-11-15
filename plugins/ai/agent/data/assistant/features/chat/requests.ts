import { PerCall, Repeatable, deny, guard, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { sessionChanged } from "../../gateways/chat-parts/chat-parts.events.js";
import { ChatSchema, QueueChangeInChatSchema } from "../../shared/schema/chat.schema.js";
import { TextAskedSchema } from "../../shared/schema/attachment.schema.js";
import { chatOf } from "./lib/chat-of.js";
import { labelledFaceOf, servedToolNameOf } from "./lib/labelled-face.js";
import type { ToolLabel } from "../../shared/schema/tool-label.schema.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";

const APP_CALLABLE: ReadonlySet<string> = new Set(
	[
		"chat",
		"retry-turn",
		"stop-turn",
		"send-message",
		"send-text",
		"change-queue",
		"compact-chat",
		"clear-chat",
		"draft-attachments",
		"attach-files",
		"remove-attachment",
		"sweep-attachments",
		"attach-reach",
		"composer-prefill",
		"prefill-draft",
		"take-prefill",
		"hold-draft-text",
		"open-chat-draft",
		"slash-commands",
		"agent-setup",
		"claude-options",
		"working-folders",
		"choose-provider",
		"open-providers",
		"choose-claude-option",
		"choose-claude-model",
		"choose-working-folder",
		"pick-working-folder",
	].map((short) => `assistant/${short}`),
);
const NOT_FOR_APPS =
	"{request} is not open to apps: an app reaches only its own chat's conversation and reads the agent setup";

export const AssistantCallersGuard = guard().handle(({ request, context }) => {
	if (context.user !== null && !APP_CALLABLE.has(request)) {
		deny(NOT_FOR_APPS.replace("{request}", request));
	}
});

export const one = query()
	.public()
	.input(ChatKeySchema)
	.output(ChatSchema)
	.settlesNow()
	.handle(
		inChat((_input, { assistantSession, toolLabels }) => {
			const session = assistantSession.session();
			const labelOf = (callName: string): ToolLabel | null => {
				const named = servedToolNameOf(callName);
				return named === null ? null : toolLabels.labelOf(named);
			};
			return chatOf({
				isAvailable: assistantSession.isAvailable(),
				session,
				cards: assistantSession.cardsOf(session),
				faces: session.turns.map((turn) =>
					turn.calls.map((call) => labelledFaceOf(call, assistantSession.faceOf(call), labelOf(call.name))),
				),
			});
		}),
	);

export const retryTurn = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.handle(inChat((_input, { assistantSession }) => assistantSession.retry()));

export const stopTurn = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.handle(inChat((_input, { assistantSession }) => assistantSession.stop()));

export const changeQueue = command()
	.public()
	.input(QueueChangeInChatSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(({ change }, { assistantSession }) => {
			const refusal = assistantSession.changeQueue(change);
			return refusal === null ? undefined : refuse(refusal);
		}),
	);

export const sendText = command()
	.public()
	.input(TextAskedSchema)
	.idempotencyKey(PerCall)
	.handle(inChat(({ said }, { assistantSession }) => assistantSession.send(said)));

export const rereadChat = subscriber(sessionChanged).handle(({ chat: chatId }, { invalidate }) => {
	invalidate(one, { chat: chatId });
});
