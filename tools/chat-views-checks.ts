import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { z } from "zod";
import { fileSystem, terminal } from "@sumi/contract";
import { localTransport, runtime } from "@widgetarium/data-framework";
import type { McpServer } from "@widgetarium/data-framework";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { fileSystem as fileSystemModule } from "../apps/tauri/capabilities/file-system/generated/module.ts";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { terminal as terminalModule } from "../apps/tauri/capabilities/terminal/generated/module.ts";
import { NodeProcessesGateway } from "../apps/tauri/capabilities/terminal/gateways/processes/node.gateway.ts";
import { NodeProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/node.gateway.ts";
import { memoryTerminalParts } from "../apps/tauri/capabilities/terminal/gateways/terminal-parts/terminal-parts.gateway.ts";
import { mcpServeOf } from "../plugins/ai/agent/src/features/serve-mcp/lib/serve-mcp.ts";
import { ShownViewSchema, StoredViewSchema } from "../plugins/ai/chat-views/data/view-work/generated/contract.ts";
import { viewWork } from "../plugins/ai/chat-views/data/view-work/generated/module.ts";
import { lintedViewOf } from "../plugins/ai/chat-views/data/view-work/features/views/lib/view-lint.ts";
import { VIEW_TEMPLATES } from "../plugins/ai/chat-views/src/features/chat-view/lib/view-templates.ts";
import { check, tally } from "./check-helpers.ts";

const WORKSPACE = "chat-views-workspace";
const home = mkdtempSync(join(tmpdir(), "chat-views-home-"));
process.env["HOME"] = home;
globalThis.DOMParser = new JSDOM("").window.DOMParser;

const core = runtime()
	.modules(
		fileSystemModule({ injects: { files: new NodeFilesGateway(join(tmpdir(), "chat-views-data"), WORKSPACE) } }),
		terminalModule({
			injects: {
				...memoryTerminalParts(),
				programs: new NodeProgramsGateway(),
				processes: new NodeProcessesGateway(),
			},
		}),
	)
	.start({
		platform: "server",
		env: {},
		scope: { workspaceId: WORKSPACE },
	});
const local = localTransport();
local.serve(core, { authenticate: new AppCallerAuthenticate() });
const windowApp = runtime().start({
	platform: "browser",
	env: {},
	scope: { workspaceId: WORKSPACE },
});
const server: McpServer = mcpServeOf(
	{
		name: "views",
		modules: [
			viewWork({
				parts: [
					{
						id: "probe",
						guide: "Probe part: a plugin's own guide line.",
						css: "",
						script: "",
						transform: null,
					},
				],
				templates: VIEW_TEMPLATES,
			}),
		],
		importsOf: (stamped) => [fileSystem({ over: stamped }), terminal({ over: stamped })],
	},
	[],
)({
	workspaceId: WORKSPACE,
	platform: "browser",
	windowApp,
	core: local,
	windowServer: local,
	focusedChatId: () => null,
});

const ReplySchema = z.object({
	result: z.object({
		content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
		isError: z.boolean().optional(),
	}),
});

async function called(tool: string, args: unknown): Promise<{ readonly isError: boolean; readonly text: string }> {
	const reply = await server.answer(
		{
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: {
				name: tool,
				arguments: args,
			},
		},
		{ headers: new Headers({ "sumi-chat": "chat-1" }) },
	);
	const { result } = ReplySchema.parse(reply);
	return {
		isError: result.isError === true,
		text: result.content.find((part) => part.type === "text")?.text ?? "",
	};
}

const GOOD = `<div class="grid three"><a class="item" href="https://example.com/a"><img class="media" src="https://example.com/a.jpg" alt=""><span class="title">A</span><span class="price">€10</span></a></div>`;

check("views serves every tool", server.tools.map(({ name }) => name).sort(), [
	"view-work_guide_read",
	"view-work_views_duplicate",
	"view-work_views_read",
	"view-work_views_remove",
	"view-work_views_saved",
	"view-work_views_show",
	"view-work_views_show-saved",
]);
check(
	"show and show-saved name the chat view",
	server.tools
		.filter(({ _meta }) => JSON.stringify(_meta?.["ui"]) === JSON.stringify({ resourceUri: "ui://chat-view" }))
		.map(({ name }) => name)
		.sort(),
	["view-work_views_show", "view-work_views_show-saved"],
);

const guide = await called("view-work_guide_read", {});
check("the guide is read", guide.isError, false);
check(
	"the guide carries a registered part's own line",
	guide.text.includes("Probe part: a plugin's own guide line."),
	true,
);

const unread = await called("view-work_views_show", {
	guideRead: false,
	title: "Picks",
	purpose: "Pick one",
	html: GOOD,
});
check("a view before the guide is refused", [unread.isError, unread.text.includes("guide_read")], [true, true]);

const styled = await called("view-work_views_show", {
	guideRead: true,
	title: "Picks",
	purpose: "Pick one",
	html: `<div class="card" style="padding: 10px"><p style="color: #fff; font-family: Arial">x</p></div>`,
});
check("a view off the design system is refused", styled.isError, true);
check(
	"the refusal names the colour, the font, the spacing and the outer card",
	["#fff", "font-family", "10px", "outer <div>"].map((part) => styled.text.includes(part)),
	[true, true, true, true],
);
check("a refused view is not saved", readdirSync(home).includes(".sumi"), false);

const shown = await called("view-work_views_show", {
	guideRead: true,
	title: "Laptop picks",
	purpose: "Choose a laptop",
	html: GOOD,
});
const shownView = ShownViewSchema.safeParse(JSON.parse(shown.text || "null"));
check("a clean view is shown and answers what the chat view reads", [shown.isError, shownView.success], [false, true]);
check("its id comes from its title", shownView.success ? shownView.data.id.startsWith("laptop-picks-") : null, true);
check(
	"it is saved in the global library under the home folder",
	shownView.success ? shownView.data.path.startsWith(join(home, ".sumi", "views")) : null,
	true,
);

const id = shownView.success ? shownView.data.id : "missing";
interface Listed {
	readonly id: string;
	readonly purpose: string;
	readonly builtIn: boolean;
}
const listed = async (): Promise<readonly Listed[]> =>
	JSON.parse((await called("view-work_views_saved", {})).text || "[]");
const ownOf = (views: readonly Listed[]): readonly Listed[] => views.filter((view) => view.builtIn !== true);
const firstList = await listed();
check("the library lists it first, with its purpose", firstList[0]?.purpose, "Choose a laptop");
check(
	"the library lists every built-in view after the person's own",
	firstList.filter((view) => view.builtIn).length,
	VIEW_TEMPLATES.length,
);
check(
	"built-in views are not copied to disk",
	readdirSync(join(home, ".sumi", "views")).filter((name) => name.startsWith("sumi-")),
	[],
);
const keptBuiltIn = await called("view-work_views_show", {
	guideRead: true,
	title: "Recipe",
	purpose: "Cook",
	html: GOOD,
	id: "sumi-recipe",
});
check(
	"changing a built-in view is refused with the way to copy it",
	[keptBuiltIn.isError, keptBuiltIn.text.includes("view-work_views_duplicate")],
	[true, true],
);
check(
	"removing a built-in view is refused",
	(await called("view-work_views_remove", { id: "sumi-recipe" })).isError,
	true,
);
const copied = JSON.parse(
	(await called("view-work_views_duplicate", { id: "sumi-recipe", title: "Grandma's pancakes" })).text || "{}",
);
check(
	"a built-in view is copied under a new id of the person's",
	[copied.builtIn, String(copied.id).startsWith("grandma-s-pancakes-")],
	[false, true],
);
const changedCopy = await called("view-work_views_show", {
	guideRead: true,
	title: "Grandma's pancakes",
	purpose: "Cook",
	html: GOOD,
	id: copied.id,
});
check("the copy can be changed", changedCopy.isError, false);
check(
	"the built-in one stays as it was",
	JSON.parse((await called("view-work_views_read", { id: "sumi-recipe" })).text || "{}").html,
	VIEW_TEMPLATES.find(({ id }) => id === "sumi-recipe")?.html,
);
const builtInShown = ShownViewSchema.safeParse(
	JSON.parse((await called("view-work_views_show-saved", { id: "sumi-recipe" })).text || "null"),
);
check(
	"a built-in view is shown with no file behind it",
	builtInShown.success ? [builtInShown.data.path, builtInShown.data.builtIn] : null,
	[null, true],
);
await called("view-work_views_remove", { id: copied.id });

const changed = await called("view-work_views_show", {
	guideRead: true,
	title: "Laptop picks",
	purpose: "Choose a laptop",
	html: GOOD.replace("€10", "€12"),
	id,
});
check("a change keeps the view's id", ShownViewSchema.safeParse(JSON.parse(changed.text || "null")).data?.id, id);
const read = StoredViewSchema.safeParse(JSON.parse((await called("view-work_views_read", { id })).text || "null"));
check("reading it answers the changed HTML", read.success ? read.data.html.includes("€12") : null, true);
check("the library still holds one view of its own", ownOf(await listed()).length, 1);
check(
	"a change to a view that does not exist is refused",
	(await called("view-work_views_show", { guideRead: true, title: "X", purpose: "Y", html: GOOD, id: "gone-1" }))
		.isError,
	true,
);

const again = ShownViewSchema.safeParse(
	JSON.parse((await called("view-work_views_show-saved", { id })).text || "null"),
);
check("show-saved shows it again without its HTML", again.success ? again.data.id : null, id);
check(
	"removing it answers removed",
	JSON.parse((await called("view-work_views_remove", { id })).text || "{}").removed,
	true,
);
check("the library holds none of its own after", ownOf(await listed()).length, 0);
check(
	"every template passes the design rules",
	VIEW_TEMPLATES.filter(({ html }) => lintedViewOf(html).length > 0).map(({ id }) => id),
	[],
);

const problemsOf = (html: string): readonly string[] => lintedViewOf(html).map(({ rule }) => rule);
check(
	"tabs with fewer panels than buttons are refused",
	problemsOf(
		`<div class="tabs"><div class="tab-list"><button>A</button><button>B</button></div><div class="tab-panel">a</div></div>`,
	).length,
	1,
);
check(
	"tabs with a panel per button pass",
	problemsOf(
		`<div class="tabs"><div class="tab-list"><button>A</button><button>B</button></div><div class="tab-panel">a</div><div class="tab-panel">b</div></div>`,
	),
	[],
);
check("a dialog with no opener is refused", problemsOf(`<dialog id="d"><p>x</p></dialog>`).length, 1);
check(
	"a dialog with its opener passes",
	problemsOf(`<button data-opens="d">Open</button><dialog id="d"><p>x</p></dialog>`),
	[],
);
check(
	"a chart with a word in a number cell is refused",
	problemsOf(
		`<table class="chart" data-kind="bar"><thead><tr><th></th><th>A</th></tr></thead><tbody><tr><td>Q1</td><td>many</td></tr></tbody></table>`,
	).length,
	1,
);
check(
	"a chart of numbers passes",
	problemsOf(
		`<table class="chart" data-kind="line"><thead><tr><th></th><th>A</th></tr></thead><tbody><tr><td>Q1</td><td>1 200,5</td></tr></tbody></table>`,
	),
	[],
);
check("a middle dot between items is refused", problemsOf(`<p>a · b</p>`).length, 1);
check("an ellipsis inside code is allowed", problemsOf(`<pre data-language="ts">f(...args)</pre>`), []);
check(
	"a script from the network is refused",
	problemsOf(`<div class="stack"><p>x</p></div><script src="https://cdn.example.com/x.js"></script>`).length,
	1,
);
check("an invented relative image is refused", problemsOf(`<img src="photo.jpg" alt="">`).length, 1);
check(
	"a colour inside var() passes",
	problemsOf(`<div class="stack" style="gap: 8px"><p style="color: var(--danger)">x</p></div>`),
	[],
);

console.log(tally.failed === 0 ? "chat views: all checks passed" : `chat views: ${tally.failed} checks failed`);
process.exit(tally.failed === 0 ? 0 : 1);
