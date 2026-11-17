import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { localTransport, runtime } from "@widgetarium/data-framework";
import type { McpServer } from "@widgetarium/data-framework";
import { fileSystem as fileSystemModule } from "../apps/tauri/capabilities/file-system/generated/module.ts";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { terminal as terminalModule } from "../apps/tauri/capabilities/terminal/generated/module.ts";
import { NodeProcessesGateway } from "../apps/tauri/capabilities/terminal/gateways/processes/node.gateway.ts";
import { NodeProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/node.gateway.ts";
import { memoryTerminalParts } from "../apps/tauri/capabilities/terminal/gateways/terminal-parts/terminal-parts.gateway.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { agentToolsServeOf } from "../plugins/ai/agent/src/features/serve-mcp/lib/agent-tools-serve.ts";
import {
	labelledFaceOf,
	servedToolNameOf,
} from "../plugins/ai/agent/data/assistant/features/chat/lib/labelled-face.ts";
import { ServedToolLabelsGateway } from "../plugins/ai/agent/data/assistant/gateways/tool-labels/served.gateway.ts";
import { callVerbOf } from "../plugins/ai/chat/src/features/assistant/lib/call-verb.ts";
import { globRegexOf } from "../plugins/ai/agent/data/agent-tools/features/files/lib/glob-paths.ts";
import { pageTextOf } from "../plugins/ai/agent/data/agent-tools/features/web/lib/page-text.ts";
import { check, tally } from "./check-helpers.ts";

const WORKSPACE = "agent-tools-workspace";
const folder = mkdtempSync(join(tmpdir(), "agent-tools-"));
const notes = join(folder, "notes.md");
writeFileSync(notes, "one\ntwo\nthree two\n");
writeFileSync(join(folder, "app.ts"), "export const answer = 42;\n");

const core = runtime()
	.modules(
		fileSystemModule({ injects: { files: new NodeFilesGateway(join(folder, "app-data"), WORKSPACE) } }),
		terminalModule({
			injects: { ...memoryTerminalParts(), programs: new NodeProgramsGateway(), processes: new NodeProcessesGateway() },
		}),
	)
	.start({ platform: "server", env: {}, scope: { workspaceId: WORKSPACE } });
const local = localTransport();
local.serve(core, { authenticate: new AppCallerAuthenticate() });
const nowhere = { call: () => Promise.reject(new Error("not here")), changes: () => () => undefined };
const servers: McpServer[] = [];
const server = agentToolsServeOf(servers)({
	workspaceId: WORKSPACE,
	platform: "browser",
	windowApp: runtime().start(),
	core: local,
	windowServer: nowhere,
	focusedChatId: () => null,
});

const ReplySchema = z.object({
	result: z.object({
		content: z.array(z.object({ type: z.string(), text: z.string().optional(), data: z.string().optional() })),
		isError: z.boolean().optional(),
	}),
});

async function called(tool: string, args: unknown, chat = "chat-7") {
	const reply = await server.answer(
		{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: `agent-tools_${tool}`, arguments: args } },
		{ headers: new Headers({ "sumi-chat": chat }) },
	);
	const { result } = ReplySchema.parse(reply);
	const text = result.content.find((part) => part.type === "text")?.text ?? "";
	return {
		isError: result.isError === true,
		text,
		json: result.isError === true ? null : (JSON.parse(text) as unknown),
		content: result.content,
	};
}

check(
	"the server joins the served list",
	servers.map(({ name }) => name),
	["agent-tools"],
);
check("every tool is served", server.tools.length, 14);

const read = await called("files_get-text", { path: notes, offset: 2, limit: 2 });
check("a file reads numbered, from its offset", read.json, {
	lines: ["     2\ttwo", "     3\tthree two"],
	shown: "lines 2–3 of 4",
});

const ambiguous = await called("files_edit", { path: notes, oldText: "two", newText: "2" });
check(
	"an edit of a text found twice is refused, naming the fix",
	ambiguous.isError && ambiguous.text.includes("2 times"),
	true,
);
await called("files_edit", { path: notes, oldText: "three two", newText: "three 2" });
check("an edit replaces the one occurrence on disk", readFileSync(notes, "utf8"), "one\ntwo\nthree 2\n");

await called("files_write", { path: join(folder, "new.txt"), content: "fresh" });
check("a write lands on disk", readFileSync(join(folder, "new.txt"), "utf8"), "fresh");

const paths = await called("files_find-paths", { folder, pattern: "**/*.ts" });
check("a glob answers the matching files", paths.json, { paths: [join(folder, "app.ts")], isCut: false });

const matches = await called("files_find-matches", { folder, pattern: "answer = [0-9]+" });
check("grep answers path:line:text", matches.json, {
	lines: [`${join(folder, "app.ts")}:1:export const answer = 42;`],
	isCut: false,
});
const none = await called("files_find-matches", { folder, pattern: "nothing-like-this" });
check("grep with no match answers no lines, not an error", none.json, { lines: [], isCut: false });

const ran = await called("shell_run", { command: "echo out; echo err >&2; exit 3", folder });
const ranJson = z
	.object({ status: z.string(), exitCode: z.number().nullable(), lines: z.array(z.string()) })
	.parse(ran.json);
check("a shell run waits for the exit and answers its code", [ranJson.status, ranJson.exitCode], ["exited", 3]);
check("stderr lines are marked", [...ranJson.lines].sort(), ["[err] err", "out"]);

const slow = await called("shell_run", { command: "sleep 5", folder, timeoutSeconds: 1 });
const slowJson = z.object({ name: z.string(), status: z.string() }).parse(slow.json);
check("a run past its timeout keeps running", slowJson.status, "running");
await called("shell_stop", { name: slowJson.name });
const stopped = await called("shell_get-output", { name: slowJson.name });
check(
	"a stopped run reads as not running",
	z.object({ status: z.string() }).parse(stopped.json).status !== "running",
	true,
);

await called("shell_start", { name: "ticker", command: "echo tick; sleep 30", folder });
const otherChat = await called("shell_get-output", { name: "ticker" }, "chat-8");
check(
	"another chat does not see this chat's process",
	z.object({ status: z.string() }).parse(otherChat.json).status,
	"not-started",
);
await called("shell_stop", { name: "ticker" });

const now = await called("clock_get-now", {});
check("the clock answers UTC", z.object({ utc: z.string() }).parse(now.json).utc.endsWith("Z"), true);

const notPng = await called("files_get-image", { path: notes });
check("an image that is not PNG is refused", notPng.isError, true);
writeFileSync(
	join(folder, "dot.png"),
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
		"base64",
	),
);
const image = await called("files_get-image", { path: join(folder, "dot.png") });
check("a PNG answers as image content", image.content[0]?.type, "image");

check("glob ** crosses folders", globRegexOf("src/**/*.ts").test("src/a/b/c.ts"), true);
check("glob * stays in one folder", globRegexOf("*.ts").test("a/b.ts"), false);
check(
	"a page reads as text, scripts and tags dropped",
	pageTextOf("<html><script>x()</script><p>Hello &amp; <b>bye</b></p><div>next</div></html>"),
	"Hello & bye\n\nnext",
);

const toolLabels = new ServedToolLabelsGateway(servers);
const BARE_FACE = {
	kind: "other" as const,
	glyph: "widget",
	verb: "",
	doing: "",
	object: "",
	isCodeObject: false,
	meta: null,
	change: null,
};

function shownCallOf(tool: string, input: Record<string, unknown>, isAnswered: boolean): string {
	const call = {
		ref: "c1",
		name: `mcp__agent-tools__agent-tools_${tool}`,
		input,
		output: "",
		answered: isAnswered,
		failed: false,
		at: 0,
	};
	const named = servedToolNameOf(call.name);
	const face = labelledFaceOf(call, BARE_FACE, named === null ? null : toolLabels.labelOf(named));
	return `${callVerbOf(face, isAnswered)} ${face.object}`;
}

check(
	"a finished shell run reads as Ran and its command",
	shownCallOf("shell_run", { command: "ls -la" }, true),
	"Ran ls -la",
);
check("a running shell run reads as Running", shownCallOf("shell_run", { command: "ls" }, false), "Running ls");
check(
	"a read file shows its name only",
	shownCallOf("files_get-text", { path: "/a/b/README.md" }, true),
	"Read README.md",
);
check("an edit reads as Edited", shownCallOf("files_edit", { path: "/a/app.ts" }, true), "Edited app.ts");
check(
	"a glob reads as Found, its own word",
	shownCallOf("files_find-paths", { pattern: "**/*.md" }, true),
	"Found **/*.md",
);
check(
	"a page fetch reads as Fetching while it runs",
	shownCallOf("web_fetch-page", { url: "https://wttr.in" }, false),
	"Fetching https://wttr.in",
);
check(
	"a write reads as Wrote, its own word",
	shownCallOf("files_write", { path: "/a/new.txt" }, true),
	"Wrote new.txt",
);
check("a tool of a server that is not served has no label", toolLabels.labelOf({ server: "tasks", tool: "x" }), null);
check("a call that is not an MCP tool names no server", servedToolNameOf("Bash"), null);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("agent tools: all checks passed");
process.exit(0);
