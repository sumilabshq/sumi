import { app } from "@widgetarium/data-framework";
import type { AssistantPort } from "../packages/shared/core/src/engine/assistant-port.ts";
import {
	ChatQuery,
	ComposerPrefillQuery,
	PrefillDraftCommand,
	SendMessageCommand,
} from "../plugins/chat/data/assistant/index.ts";
import { AssistantModule } from "../plugins/chat/data/assistant/module.ts";
import { check, tally } from "./check-helpers.ts";
import { echoAssistantPort } from "./echo-assistant-port.ts";

function chatPortsOf(asked: string[]): AssistantPort {
	const ports = new Map<string, AssistantPort>();
	return {
		...echoAssistantPort(),
		forChat: (chatId) => {
			asked.push(chatId);
			const held = ports.get(chatId) ?? echoAssistantPort();
			ports.set(chatId, held);
			return held;
		},
	};
}

function saidOf(answer: Awaited<ReturnType<typeof chats.send<typeof ChatQuery>>>): readonly string[] {
	return answer.ok ? answer.output.session.turns.map(({ text }) => text) : [answer.reason];
}

const asked: string[] = [];
const chats = app()
	.modules(AssistantModule({ kind: "web", webAssistant: chatPortsOf(asked) }))
	.start({
		platform: "browser",
		scope: {
			workspaceId: "assistant-chats",
		},
	});

await chats.send(SendMessageCommand, { chat: "first", said: "plan the release" });
check(
	"one assistant module keeps each chat's conversation apart",
	[
		saidOf(await chats.send(ChatQuery, { chat: "first" })).length > 0,
		saidOf(await chats.send(ChatQuery, { chat: "second" })),
		saidOf(await chats.send(ChatQuery, { chat: null })),
	],
	[true, [], []],
);
check("its gateways pick each chat's port from the lent host by the chat's id", [...new Set(asked)].sort(), [
	"first",
	"second",
]);

await chats.send(PrefillDraftCommand, { chat: "second", text: "draft the notes" });
const prefilled = [
	await chats.send(ComposerPrefillQuery, { chat: "first" }),
	await chats.send(ComposerPrefillQuery, { chat: "second" }),
].map((answer) => (answer.ok ? (answer.output?.text ?? null) : answer.reason));
check("a chat's composer state lives behind its own gateways", prefilled, [null, "draft the notes"]);

chats.stop();

if (tally.failed > 0) {
	process.exit(1);
}

console.log("assistant chats: all checks passed");
