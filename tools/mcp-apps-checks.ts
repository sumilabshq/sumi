import { createElement as h } from "react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { localTransport, runtime } from "@widgetarium/data-framework";
import { artboards as artboardsModule } from "../plugins/canvas/data/artboards/generated/module.ts";
import { artboards } from "../plugins/canvas/data/artboards/generated/contract.ts";
import { canvasWork } from "../plugins/canvas/data/canvas-work/generated/module.ts";
import { ShownCanvasSchema } from "../plugins/canvas/data/canvas-work/generated/contract.ts";
import { CARD_SIZE, cardLookOf } from "../plugins/canvas/data/canvas-work/shared/lib/card-look.ts";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { mcpServeOf, servedMcpOf } from "../plugins/ai/agent/src/features/serve-mcp/lib/serve-mcp.ts";
import { servedToolNameOf } from "../plugins/ai/agent/data/assistant/features/chat/lib/labelled-face.ts";
import { ServedToolLabelsGateway } from "../plugins/ai/agent/data/assistant/gateways/tool-labels/served.gateway.ts";
import { AddedViews } from "../plugins/ai/mcp-apps/src/features/call-views/lib/added-views.ts";
import { callViewsOf } from "../plugins/ai/mcp-apps/src/features/call-views/ui/call-views/call-views.tsx";
import { mcpAppsGuideOf } from "../plugins/ai/mcp-apps/src/features/call-views/lib/mcp-apps-guide.ts";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileSystem, terminal } from "@sumi/contract";
import type { McpServer, RemoteTransport } from "@widgetarium/data-framework";
import { fileSystem as fileSystemModule } from "../apps/tauri/capabilities/file-system/generated/module.ts";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { terminal as terminalModule } from "../apps/tauri/capabilities/terminal/generated/module.ts";
import { NodeProcessesGateway } from "../apps/tauri/capabilities/terminal/gateways/processes/node.gateway.ts";
import { NodeProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/node.gateway.ts";
import { memoryTerminalParts } from "../apps/tauri/capabilities/terminal/gateways/terminal-parts/terminal-parts.gateway.ts";
import { codeWork } from "../plugins/code-viewer/data/code-work/generated/module.ts";
import { ShownFileSchema } from "../plugins/code-viewer/data/code-work/generated/contract.ts";
import { git as gitModule } from "../plugins/git/data/git/generated/module.ts";
import { gitWork } from "../plugins/git/data/git-work/generated/module.ts";
import { git } from "../plugins/git/data/git/generated/contract.ts";
import { ShownChangesSchema } from "../plugins/git/data/git-work/generated/contract.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const WORKSPACE = "mcp-apps-workspace";
const SHOW_TOOL = "canvas-work_canvases_show-canvas";
const CALL_NAME = `mcp__canvas__${SHOW_TOOL}`;
const VIEW = "canvas-mini";

const core = runtime()
	.modules(
		artboardsModule({}),
		fileSystemModule({ injects: { files: new NodeFilesGateway(join(tmpdir(), "mcp-apps-data"), WORKSPACE) } }),
		terminalModule({
			injects: { ...memoryTerminalParts(), programs: new NodeProgramsGateway(), processes: new NodeProcessesGateway() },
		}),
	)
	.start({ platform: "server", env: {}, scope: { workspaceId: WORKSPACE } });
const local = localTransport();
local.serve(core, { authenticate: new AppCallerAuthenticate() });
const NO_RENDERING = {
	shotOf: () => Promise.reject(new Error("no shots here")),
	layersOf: () => [],
	withLayerName: () => null,
};
const windowApp = runtime()
	.modules(canvasWork({ rendering: NO_RENDERING }))
	.imports(artboards({ over: local }))
	.start({ platform: "browser", env: {}, scope: { workspaceId: WORKSPACE } });
const server = servedMcpOf(windowApp, "canvas", ["canvas-work"]);
const servedOf = (entry: Parameters<typeof mcpServeOf>[0]): McpServer =>
	mcpServeOf(entry, [])({
		workspaceId: WORKSPACE,
		platform: "browser",
		windowApp,
		core: local,
		windowServer: local,
		focusedChatId: () => null,
	});
const codeServer = servedOf({ name: "code", modules: [codeWork], importsOf: (stamped) => [fileSystem({ over: stamped })] });
const gitServer = servedOf({
	name: "git",
	modules: [gitWork],
	importsOf: (stamped) => [terminal({ over: stamped })],
});

const ReplySchema = z.object({
	result: z.object({
		content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
		isError: z.boolean().optional(),
	}),
});

async function called(tool: string, args: unknown, served: McpServer = server): Promise<{ readonly isError: boolean; readonly text: string }> {
	const reply = await served.answer(
		{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } },
		{ headers: new Headers({ "sumi-chat": "chat-1" }) },
	);
	const { result } = ReplySchema.parse(reply);
	return {
		isError: result.isError === true,
		text: result.content.find((part) => part.type === "text")?.text ?? "",
	};
}

const showTool = server.tools.find(({ name }) => name === SHOW_TOOL);
check("canvas serves show-canvas as a tool", showTool === undefined, false);
check("the tool names its view as ui://canvas-mini", JSON.stringify(showTool?._meta?.["ui"]), JSON.stringify({ resourceUri: `ui://${VIEW}` }));

const toolLabels = new ServedToolLabelsGateway([server]);
const named = servedToolNameOf(CALL_NAME);
check("the assistant reads the view from the served tool", named === null ? null : toolLabels.viewOf(named), VIEW);
check("and still reads its label beside it", named === null ? null : toolLabels.labelOf(named)?.done, "Showed the canvas");
check(
	"a tool with no ui in its metadata has no view",
	toolLabels.viewOf({ server: "canvas", tool: "canvas-work_canvases_get-canvas" }),
	null,
);

const written = await called("canvas-work_boards_write-board", {
	canvasId: "tab-1",
	html: "<!doctype html><p>hello</p>",
	name: "Login",
});
check("an artboard is written through the canvas tool", written.isError, false);

const secondPage = JSON.parse((await called("canvas-work_pages_create-page", { canvasId: "tab-1" })).text).page;
const secondBoard = JSON.parse(
	(await called("canvas-work_boards_write-board", { canvasId: "tab-1", page: secondPage, html: "<!doctype html><p>two</p>", name: "Two" })).text,
).board;
const firstBoard = JSON.parse((await called("canvas-work_boards_write-board", { canvasId: "tab-1", page: "page-1", html: "<!doctype html><p>one</p>", name: "One" })).text).board;
await called("canvas-work_pages_show-page", { canvasId: "tab-1", page: "page-1" });
const shown = await called(SHOW_TOOL, { canvasId: "tab-1", pages: ["page-1", secondPage], boards: [firstBoard] });
const result = ShownCanvasSchema.safeParse(JSON.parse(shown.text));
check("show-canvas answers JSON the view's schema reads", result.success, true);
check("it counts the page's artboards", result.success ? result.data.boardCount : null, 2);
check("it answers the card's view id", result.success && typeof result.data.view === "string", true);
const viewId = result.success ? (result.data.view ?? "") : "";
const kept = await windowApp.send(artboards.chatViews.getChatView, { canvasId: "tab-1", view: viewId });
check("the stored chat view has the pages and the aimed artboard", kept.ok ? [kept.output?.pages, kept.output?.boards] : kept, [["page-1", secondPage], [firstBoard]]);
check("an unknown page is refused with its reason", (await called(SHOW_TOOL, { canvasId: "tab-1", pages: ["page-1"], page: "page-9" })).isError, true);
check("a tab for a page not on the canvas is refused", (await called(SHOW_TOOL, { canvasId: "tab-1", pages: ["page-1", "page-9"] })).isError, true);
check("a first page outside the tabs is refused", (await called(SHOW_TOOL, { canvasId: "tab-1", pages: ["page-1"], page: secondPage })).isError, true);
check("an artboard of another page is refused", (await called(SHOW_TOOL, { canvasId: "tab-1", pages: ["page-1"], boards: [secondBoard] })).isError, true);
const aimed = await called("canvas-work_canvases_aim-view", { canvasId: "tab-1", view: viewId, page: secondPage, boards: [secondBoard] });
check("aim-view is accepted", aimed.isError, false);
const reaimed = await windowApp.send(artboards.chatViews.getChatView, { canvasId: "tab-1", view: viewId });
check("getChatView reads the new page and artboards", reaimed.ok ? [reaimed.output?.page, reaimed.output?.boards] : reaimed, [secondPage, [secondBoard]]);
check("aim-view keeps the tabs it was not given", reaimed.ok ? reaimed.output?.pages : reaimed, ["page-1", secondPage]);
check("aim-view refuses an artboard of another page", (await called("canvas-work_canvases_aim-view", { canvasId: "tab-1", view: viewId, boards: [firstBoard] })).isError, true);
check("aim-view refuses an unknown view", (await called("canvas-work_canvases_aim-view", { canvasId: "tab-1", view: "view-none", page: "page-1" })).isError, true);
const zoomed = await called("canvas-work_canvases_aim-view", { canvasId: "tab-1", view: viewId, area: { x: 0, y: 0, w: 200, h: 100 } });
check("aim-view zooms on an area", JSON.parse(zoomed.text).area, { x: 0, y: 0, w: 200, h: 100 });
check("clearArea drops it", JSON.parse((await called("canvas-work_canvases_aim-view", { canvasId: "tab-1", view: viewId, clearArea: true })).text).area, null);
check(
	"a result from before chat views still parses",
	ShownCanvasSchema.safeParse({ canvasId: "tab-1", title: "T", page: "page-1", pageName: "P", boardCount: 1 }).success,
	true,
);
const fitted = cardLookOf({ x: 0, y: 0, width: 200, height: 100 }, CARD_SIZE);
check("a small box is centered below the head at no more than 2x", [fitted.scale, fitted.x + 100 * fitted.scale, fitted.y + 50 * fitted.scale], [2, 360, 232]);

const pageBoards = await windowApp.send(artboards.boards.getPageBoards, { canvasId: "tab-1", page: null });
check("getPageBoards answers the page's artboards with their HTML", pageBoards.ok ? pageBoards.output[0]?.html : null, "<!doctype html><p>hello</p>");

const folder = mkdtempSync(join(tmpdir(), "mcp-apps-"));
const sourceFile = join(folder, "parse-date.ts");
writeFileSync(sourceFile, "export function parseDate(raw: string): Date {\n\tconst ms = Date.parse(raw);\n\treturn new Date(ms);\n}\n");
check("code serves show-file, naming its view", JSON.stringify(codeServer.tools.find(({ name }) => name === "code-work_files_show-file")?._meta?.["ui"]), JSON.stringify({ resourceUri: "ui://code-file" }));
const shownFile = await called("code-work_files_show-file", { path: sourceFile, marks: [{ from: 2, note: "Date.parse misreads dd.MM.yyyy" }] }, codeServer);
const fileResult = ShownFileSchema.safeParse(JSON.parse(shownFile.text));
check("show-file answers JSON the file card reads", fileResult.success, true);
check("it counts the file's lines and keeps the mark with its note", fileResult.success ? [fileResult.data.lineCount, fileResult.data.marks] : null, [5, [{ from: 2, to: 2, note: "Date.parse misreads dd.MM.yyyy" }]]);
check("a mark past the end is refused", (await called("code-work_files_show-file", { path: sourceFile, marks: [{ from: 9 }] }, codeServer)).isError, true);
check("an image is refused: it has its own viewer", (await called("code-work_files_show-file", { path: join(folder, "shot.png") }, codeServer)).isError, true);
check("a missing file is refused", (await called("code-work_files_show-file", { path: join(folder, "gone.ts") }, codeServer)).isError, true);

const repo = join(folder, "repo");
const gitIn = (...args: string[]): string => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
execFileSync("mkdir", ["-p", join(repo, "src")]);
gitIn("init", "-q", "-b", "main");
gitIn("config", "user.email", "checks@example.com");
gitIn("config", "user.name", "Checks");
writeFileSync(join(repo, "src", "a.ts"), "one\ntwo\n");
writeFileSync(join(repo, "b.ts"), "bee\n");
gitIn("add", ".");
gitIn("commit", "-q", "-m", "first");
writeFileSync(join(repo, "src", "a.ts"), "one\ntwo changed\nthree\n");
writeFileSync(join(repo, "c.ts"), "new file\n");
const changes = await called("git-work_changes_show-changes", { folder: repo }, gitServer);
const changesResult = ShownChangesSchema.safeParse(JSON.parse(changes.text));
check("show-changes answers JSON the changes card reads", changesResult.success, true);
const root = gitIn("rev-parse", "--show-toplevel").trim();
check("the tool answers the repository's root, from a folder inside it too", changesResult.success ? changesResult.data.folder : null, root);
check("uncommitted changes are labelled so", changesResult.success ? changesResult.data.label : null, "Uncommitted");
check("the card links Git at the same range", changesResult.success ? changesResult.data.link : null, `sumi://git/${root}?only=uncommitted`);
const sha = gitIn("rev-parse", "HEAD").trim();
const commit = ShownChangesSchema.safeParse(JSON.parse((await called("git-work_changes_show-changes", { folder: join(repo, "src"), only: sha }, gitServer)).text));
check("one commit is labelled by its short sha", commit.success ? commit.data.label : null, sha.slice(0, 7));
const branches = ShownChangesSchema.safeParse(JSON.parse((await called("git-work_changes_show-changes", { folder: repo, only: null, base: "main", head: "HEAD" }, gitServer)).text));
check("two sides are labelled base → head", branches.success ? branches.data.label : null, "main → HEAD");
check("a folder outside any repo is refused", (await called("git-work_changes_show-changes", { folder: tmpdir() }, gitServer)).isError, true);

const relayedAsChat: RemoteTransport = {
	call: (call) => {
		const headers = new Headers(call.headers);
		headers.set("x-sumi-app", "chat");
		return local.call({ ...call, headers });
	},
	changes: (hear) => local.changes(hear),
};
const chatPage = runtime()
	.modules(gitModule)
	.imports(fileSystem({ over: relayedAsChat }), terminal({ over: relayedAsChat }))
	.start({ platform: "browser", env: {}, scope: { workspaceId: WORKSPACE } });
const listed = await chatPage.send(git.repos.comparison, { root, head: null, base: "HEAD", only: "uncommitted" });
check("in the chat page the card lists the edited and the new file", listed.ok ? listed.output.files.map(({ path, isUntracked }) => `${path}:${isUntracked}`).toSorted() : listed, ["c.ts:true", "src/a.ts:false"]);
const committed = await chatPage.send(git.repos.comparison, { root, head: null, base: "HEAD", only: sha });
check("and one commit's files", committed.ok ? committed.output.files.map(({ path }) => path).toSorted() : committed, ["b.ts", "src/a.ts"]);
const opened = listed.ok ? await chatPage.send(git.repos.fileDiff, { folder: listed.output.folder, range: listed.output.range, path: "src/a.ts", from: null }) : null;
check("a pressed file opens as its diff", opened?.ok === true ? [opened.output.added, opened.output.removed] : opened, [2, 1]);

const TitleSchema = z.object({ title: z.string() });
const Title = ({ result: { title } }: { readonly result: z.output<typeof TitleSchema> }): ReactElement => h("p", null, title);
const views = new AddedViews();
views.add({ name: VIEW, schema: TitleSchema, view: Title, height: 120, guide: "a title" });
check("a second view of the same name refuses its plugin", thrownBy(() => views.add({ name: VIEW, schema: TitleSchema, view: Title, height: 120, guide: "a title" })).includes("added twice"), true);
check("a name that is an address is refused", thrownBy(() => views.add({ name: "https://x.dev", schema: TitleSchema, view: Title, height: 120, guide: "a title" })).includes("lowercase"), true);
check("a height of 0 is refused", thrownBy(() => views.add({ name: "zero", schema: TitleSchema, view: Title, height: 0, guide: "a title" })).includes("height"), true);

const warned: string[] = [];
const warn = console.warn;
console.warn = (said: unknown): void => void warned.push(String(said));
check("an answer that is no JSON draws nothing", views.viewOf(VIEW)?.drawnOf("not json"), null);
check("an answer of another shape draws nothing", views.viewOf(VIEW)?.drawnOf("{\"name\":1}"), null);
console.warn = warn;
check("both are logged with the view's name", warned.filter((said) => said.startsWith(`[mcp-apps] ${VIEW}:`)).length, 2);

check("no views tell the agent nothing", mcpAppsGuideOf([]), "");
check("each view's guide reaches the agent's prompt as a line", mcpAppsGuideOf(views.guides()).endsWith("\n- a title"), true);
check("the prompt keeps MCP apps apart from tab apps", mcpAppsGuideOf(views.guides()).includes("tabs_tab_open) are not MCP apps"), true);
const CallViews = callViewsOf(views);
const callOf = (output: string, answered: boolean, failed = false) => ({
	ref: "c1",
	name: CALL_NAME,
	input: {},
	output,
	answered,
	failed,
	at: 0,
});
const faceOf = (view: string | null) => ({
	kind: "read" as const,
	glyph: "",
	verb: "",
	doing: "",
	object: "",
	isCodeObject: false,
	meta: null,
	change: null,
	view,
});
const drawn = (output: string, answered: boolean, view: string | null, failed = false): string =>
	renderToStaticMarkup(h(CallViews, { calls: [callOf(output, answered, failed)], faces: [faceOf(view)] }));

check("an answered call draws its view under the call", drawn("{\"title\":\"Report\"}", true, VIEW), "<div class=\"sumi-mcp-app\" data-mcp-app=\"canvas-mini\"><p>Report</p></div>");
check("a running call holds the view's height", drawn("", false, VIEW), "<div class=\"sumi-mcp-app\" data-mcp-app=\"canvas-mini\" data-mcp-app-waiting=\"\" style=\"height:120px\"></div>");
check("a failed call draws no view: the tool row says why", drawn("boom", true, VIEW, true), "");
check("a call whose tool names no view draws nothing", drawn("{\"title\":\"Report\"}", true, null), "");
check("a view no plugin added draws nothing", drawn("{\"title\":\"Report\"}", true, "jira-issue"), "");

console.log(tally.failed ? `mcp apps: ${tally.failed} check(s) failed` : "mcp apps: all checks passed");
process.exit(tally.failed ? 1 : 0);
