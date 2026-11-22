import { PerCall, Repeatable, deny, guard, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { sessionChanged } from "../../gateways/chat-parts/chat-parts.events.js";
import { ChatSchema, QueueChangeInChatSchema } from "../../shared/schema/chat.schema.js";
import { QuickAnswerSchema, QuickAskedSchema, TextAskedSchema } from "../../shared/schema/attachment.schema.js";
import { chatOf } from "./lib/chat-of.js";
import { labelledFaceOf, servedToolNameOf } from "./lib/labelled-face.js";
import type { ToolLabel } from "../../shared/schema/tool-label.schema.js";
import { AgentChatKeySchema, ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantParts } from "../../gateways/assistant-parts/assistant-parts.gateway.js";
import type { Chat } from "../../shared/schema/chat.schema.js";
import type { ToolLabelsGateway } from "../../gateways/tool-labels/tool-labels.gateway.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";

const APP_CALLABLE: ReadonlySet<string> = new Set(
	[
		"chat",
		"agent-chat",
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
	.handle(inChat((_input, parts) => shownChatOf(parts.assistantSession.session(), parts)));

export const agentChat = query()
	.public()
	.input(AgentChatKeySchema)
	.output(ChatSchema)
	.handle(
		inChat(async ({ agent }, parts) => shownChatOf(await parts.assistantSession.agentSession(agent), parts)),
	);

interface ShownParts {
	readonly assistantSession: AssistantParts["assistantSession"];
	readonly toolLabels: ToolLabelsGateway;
}

function shownChatOf(session: AssistantSession, { assistantSession, toolLabels }: ShownParts): Chat {
	const labelOf = (callName: string): ToolLabel | null => {
		const named = servedToolNameOf(callName);
		return named === null ? null : toolLabels.labelOf(named);
	};
	const viewOf = (callName: string): string | null => {
		const named = servedToolNameOf(callName);
		return named === null ? null : toolLabels.viewOf(named);
	};
	return chatOf({
		isAvailable: assistantSession.isAvailable(),
		session,
		cards: assistantSession.cardsOf(session),
		faces: session.turns.map((turn) =>
			turn.calls.map((call) => ({
				...labelledFaceOf(call, assistantSession.faceOf(call), labelOf(call.name)),
				view: viewOf(call.name),
			})),
		),
	});
}

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

export const quickAsk = command()
	.public()
	.input(QuickAskedSchema)
	.output(QuickAnswerSchema)
	.idempotencyKey(PerCall)
	.handle(inChat(async ({ prompt }, { assistantSession }) => ({ said: await assistantSession.quickAsk(prompt) })));

export const rereadChat = subscriber(sessionChanged).handle(({ chat: chatId }, { invalidate }) => {
	invalidate(one, { chat: chatId });
	invalidate(agentChat);
});
