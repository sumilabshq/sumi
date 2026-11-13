import { z } from "zod";
import { runtime } from "@widgetarium/data-framework";
import type { McpServer, Runtime } from "@widgetarium/data-framework";
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { ask } from "../plugins/ai/questions/data/ask/generated/module.ts";
import { questions as questionsContract } from "../plugins/ai/questions/data/questions/generated/contract.ts";
import { questions as questionsModule } from "../plugins/ai/questions/data/questions/generated/module.ts";
import { MemoryQuestionsGateway } from "../plugins/ai/questions/data/questions/gateways/questions/memory.gateway.ts";
import { QuestionsDock } from "../plugins/ai/questions/src/features/questions/ui/questions-dock/questions-dock.tsx";
import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { check, tally } from "./check-helpers.ts";

const NEEDED_SAID =
	"Ask the person questions you cannot go on without: a permission, a choice only they can make, a fact that is nowhere to read. Sumi shows them in a black block above the input that stays until answered, one at a time, and this call waits for every answer. Ask only what truly blocks you; for anything with a sensible default use ask_questions_optional. Use it instead of AskUserQuestion, which does not work here.";
const OPTIONAL_SAID =
	"Ask the person questions that do not stop you: a preference, a side fix you noticed, a clean-up. Sumi folds them into a grey pill the person opens when they like; every one can be skipped. The call answers at once with their ids: keep working on your default. Answers arrive between your steps or with the person's next message, as a list of answers; a skipped question means you do what its skipSays said.";

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

async function openOf(windowApp: Runtime, chat: string): Promise<{ needed: string[]; optional: string[] }> {
	const answer = await windowApp.send(questionsContract.dock.questionsOfChat, { chat });

	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return {
		needed: answer.output.needed.map(({ question }) => question),
		optional: answer.output.optional.map(({ question }) => question),
	};
}

async function neededIdOf(windowApp: Runtime, chat: string): Promise<string> {
	for (;;) {
		const answer = await windowApp.send(questionsContract.dock.questionsOfChat, { chat });
		const [first] = answer.ok ? answer.output.needed : [];

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
	"the questions plugin fills the chat's dock slot with the questions dock",
	resolved.slotFills.fillOf("chat.dock").added.includes(QuestionsDock),
	true,
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
	"the server serves the ask tools under their short names",
	server?.tools.map(({ name }) => name),
	["ask_questions_needed", "ask_questions_optional"],
);
check(
	"each tool carries the old tool's description, pointing at the new sibling's name",
	server?.tools.map(({ description }) => description),
	[NEEDED_SAID, OPTIONAL_SAID],
);
check(
	"needed takes at most 4 questions, optional at most 10 and requires skipSays",
	server?.tools.map(({ inputSchema }) => [
		JSON.stringify(inputSchema).match(/"maxItems":(4|10)\b/)?.[1],
		JSON.stringify(inputSchema).includes('"required":["question","skipSays"]'),
	]),
	[
		["4", false],
		["10", true],
	],
);

const posted = await server?.answer(
	toolCall("ask_questions_optional", {
		questions: [{ question: "Rename the file too?", detail: null, options: null, skipSays: "I leave the name" }],
	}),
	headersOf("chat-7"),
);
check(
	"optional answers at once with one posted id",
	z.object({ ids: z.array(z.string()) }).parse(toolOutputOf(posted)).ids.length,
	1,
);
check(
	"optional posts the question for the chat the header names, and no other",
	[await openOf(windowApp, "chat-7"), await openOf(windowApp, "chat-8")],
	[
		{ needed: [], optional: ["Rename the file too?"] },
		{ needed: [], optional: [] },
	],
);

const refused = await server?.answer(
	toolCall("ask_questions_optional", { questions: [{ question: "Anyone there?", skipSays: "I go on" }] }),
	{},
);
check("a call with no sumi-chat header is refused", JSON.stringify(refused).includes('"isError":true'), true);
check("a refused call posts nothing", (await openOf(windowApp, "chat-7")).optional, ["Rename the file too?"]);

const waiting = server?.answer(
	toolCall("ask_questions_needed", {
		questions: [{ question: "Push to main?", options: [{ label: "No" }, { label: "Yes" }] }],
	}),
	headersOf("chat-9"),
);
const neededId = await neededIdOf(windowApp, "chat-9");
await windowApp.send(questionsContract.dock.answer, { chat: "chat-9", id: neededId, picked: ["No"], own: null });
check("needed waits for the person and answers with their pick", toolOutputOf(await waiting), {
	answers: [{ question: "Push to main?", picked: ["No"], own: null }],
});

windowApp.stop();

if (tally.failed > 0) {
	process.exitCode = 1;
}
