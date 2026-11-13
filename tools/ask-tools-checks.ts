import { z } from "zod";
import { runtime } from "@widgetarium/data-framework";
import type { McpServer, Runtime } from "@widgetarium/data-framework";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { ask } from "../plugins/ai/questions/data/ask/generated/module.ts";
import { questions as questionsContract } from "../plugins/ai/questions/data/questions/generated/contract.ts";
import { questions as questionsModule } from "../plugins/ai/questions/data/questions/generated/module.ts";
import { MemoryQuestionsGateway } from "../plugins/ai/questions/data/questions/gateways/questions/memory.gateway.ts";
import { BackToQuestions } from "../plugins/ai/questions/src/features/questions/ui/back-to-questions/back-to-questions.tsx";
import { OpenQuestions } from "../plugins/ai/questions/src/features/questions/ui/questions-block/open-questions.tsx";
import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { check, tally } from "./check-helpers.ts";

const ASK_SAID =
	"Ask the person questions you cannot go on without: a permission, a choice only they can make, a fact that is nowhere to read. Sumi shows them in a grey block in the chat that stays until answered, one at a time, and this call waits for every answer. Ask only what truly blocks you. Use it instead of AskUserQuestion, which does not work here.";

function windowAppOf(): Runtime {
	return runtime()
		.modules(ask, questionsModule({ injects: { questions: new MemoryQuestionsGateway() } }))
		.start({
			platform: "browser",
			scope: { workspaceId: "ask-tools-workspace" },
		});
}

function offersOf(windowApp: Runtime): WindowOffers {
	return {
		workspaceId: "ask-tools-workspace",
		platform: "browser",
		windowApp,
		core: { call: () => Promise.reject(new Error("no core here")), changes: () => () => undefined },
		windowServer: { call: () => Promise.reject(new Error("no window server here")), changes: () => () => undefined },
		focusedChatId: () => null,
	};
}

function toolCall(name: string, args: unknown): unknown {
	return {
		jsonrpc: "2.0",
		id: 1,
		method: "tools/call",
		params: { name, arguments: args },
	};
}

const ToolReplySchema = z.object({
	result: z.object({
		content: z.array(z.object({ text: z.string() })).min(1),
		isError: z.boolean().optional(),
	}),
});

function toolOutputOf(reply: unknown): unknown {
	const [first] = ToolReplySchema.parse(reply).result.content;
	return first === undefined ? null : JSON.parse(first.text);
}

function headersOf(chat: string): { readonly headers: Headers } {
	return { headers: new Headers({ "sumi-chat": chat }) };
}

async function openOf(windowApp: Runtime, chat: string): Promise<string[]> {
	const answer = await windowApp.send(questionsContract.chat.questionsOfChat, { chat });

	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output.open.map(({ question }) => question);
}

async function firstOpenIdOf(windowApp: Runtime, chat: string): Promise<string> {
	for (;;) {
		const answer = await windowApp.send(questionsContract.chat.questionsOfChat, { chat });
		const [first] = answer.ok ? answer.output.open : [];

		if (first !== undefined) {
			return first.id;
		}

		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}

const resolved = startSumiPlugins(builtInPluginState());
check(
	"the built-in plugins start with no refusal naming questions",
	resolved.refusals.filter((refusal) => refusal.includes("questions")),
	[],
);
check(
	"the questions plugin draws the open questions in the chat and names the way back to them",
	[
		resolved.slotFills.fillOf("chat.before-live").added.includes(OpenQuestions),
		resolved.slotFills.fillOf("chat.to-end-label").added.includes(BackToQuestions),
	],
	[true, true],
);
check(
	"the questions plugin starts the questions module in the core",
	resolved.backgroundModules.some(({ contract }) => contract.name === "questions"),
	true,
);

const windowApp = windowAppOf();
const served: McpServer[] = resolved.agentMcpServers.map(({ serve }) => serve(offersOf(windowApp)));
const server = served.find(({ name }) => name === "questions");
check("the questions plugin registers the questions MCP server through mcp", server?.name, "questions");
check(
	"the server serves one ask tool, and no optional one",
	server?.tools.map(({ name }) => name),
	["ask_questions_ask-person"],
);
check(
	"the tool says where Sumi shows the questions",
	server?.tools.map(({ description }) => description),
	[ASK_SAID],
);
check(
	"the tool takes at most 4 questions and no skipSays",
	server?.tools.map(({ inputSchema }) => [
		JSON.stringify(inputSchema).includes('"maxItems":4'),
		JSON.stringify(inputSchema).includes("skipSays"),
	]),
	[[true, false]],
);

const refused = await server?.answer(
	toolCall("ask_questions_ask-person", { questions: [{ question: "Anyone there?" }] }),
	{},
);
check("a call with no sumi-chat header is refused", JSON.stringify(refused).includes('"isError":true'), true);

const waiting = server?.answer(
	toolCall("ask_questions_ask-person", {
		questions: [{ question: "Push to main?", options: [{ label: "No" }, { label: "Yes" }] }],
	}),
	headersOf("chat-9"),
);
const firstOpenId = await firstOpenIdOf(windowApp, "chat-9");
check(
	"the question is open for the chat the header names, and no other",
	[await openOf(windowApp, "chat-9"), await openOf(windowApp, "chat-8")],
	[["Push to main?"], []],
);
await windowApp.send(questionsContract.chat.answer, { chat: "chat-9", id: firstOpenId, picked: ["No"], own: null });
check("the ask waits for the person and answers with their pick", toolOutputOf(await waiting), {
	answers: [{ question: "Push to main?", picked: ["No"], own: null }],
});
check("an answered question is no longer open", await openOf(windowApp, "chat-9"), []);

windowApp.stop();

if (tally.failed > 0) {
	process.exitCode = 1;
}
