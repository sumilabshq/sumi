import { app, localTransport } from "../packages/shared/framework/src/index.ts";
import type { StartedApp } from "../packages/shared/framework/src/index.ts";
import { server } from "../packages/shared/framework/src/server/index.ts";
import {
	AnswerQuestionCommand,
	ChatQuestionsQuery,
	DeliverQuestionsCommand,
	PostQuestionsCommand,
	ReadyAnswersQuery,
	QuestionsModule as QuestionsContract,
	SkipQuestionsCommand,
} from "../packages/domain/questions/generated/contract.ts";
import { QuestionsModule } from "../packages/domain/questions/module.ts";
import { MemoryQuestionsGateway } from "../packages/domain/questions/gateways/questions/memory.gateway.ts";
import { check, tally } from "./check-helpers.ts";

const CHAT = "chat-1";

function questionsApp(): StartedApp {
	const link = localTransport();
	server()
		.modules(QuestionsModule.with({ questions: new MemoryQuestionsGateway() }))
		.listen(link)
		.start({ env: {} });
	return app().imports(QuestionsContract.over(link)).start();
}

async function sent<T>(answering: Promise<{ readonly ok: true; readonly output: T } | { readonly ok: false; readonly reason: string }>): Promise<T> {
	const answer = await answering;

	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}

const questions = questionsApp();
const { ids } = await sent(
	questions.send(PostQuestionsCommand, {
		chat: CHAT,
		need: "optional",
		questions: [
			{ question: "Also fix the lint error in tool-calls.tsx?", skipSays: "I leave it and list it at the end" },
			{ question: "Close 2 of your tabs?", skipSays: "I keep them open" },
		],
	}),
);
const [lint = "", tabs = ""] = ids;

await sent(questions.send(AnswerQuestionCommand, { chat: CHAT, id: lint, picked: [], own: "Fix it" }));
const halfway = await sent(questions.send(ReadyAnswersQuery, { chat: CHAT }));
check("a card with an ask still open has nothing ready for the queue", [halfway.text, halfway.questions.length], [null, 0]);
check(
	"and the answered ask stays on the card",
	(await sent(questions.send(ChatQuestionsQuery, { chat: CHAT }))).optional.map(({ state }) => state),
	["answered", "open"],
);

await sent(questions.send(SkipQuestionsCommand, { chat: CHAT, ids: [tabs] }));
const handed = await sent(questions.send(ReadyAnswersQuery, { chat: CHAT }));
check(
	"once every ask is answered, all answers go as one text, question by question",
	handed.text,
	[
		"The person answered your questions in Sumi:",
		"- Also fix the lint error in tool-calls.tsx? → Fix it",
		"- Close 2 of your tabs? → skipped, so you do what you said: I keep them open",
	].join("\n"),
);
check(
	"reading the ready answers marks nothing: the card keeps them until they are queued",
	(await sent(questions.send(ChatQuestionsQuery, { chat: CHAT }))).optional.length,
	2,
);
await sent(questions.send(DeliverQuestionsCommand, { chat: CHAT, ids: handed.questions.map(({ id }) => id) }));
check(
	"once queued and marked, the card empties",
	(await sent(questions.send(ChatQuestionsQuery, { chat: CHAT }))).optional.length,
	0,
);
check("and nothing is ready a second time", (await sent(questions.send(ReadyAnswersQuery, { chat: CHAT }))).text, null);

if (tally.failed > 0) {
	console.log(`questions queue: ${tally.failed} check(s) failed`);
	process.exit(1);
}

console.log("questions queue: all checks passed");
process.exit(0);
