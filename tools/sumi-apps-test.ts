import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { RequestListener, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { getRequestListener } from "@hono/node-server";
import { localTransport } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { APP_FRAME_SANDBOX } from "../apps/studio/src/features/app-frame/lib/frame-sandbox.ts";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { FileSystemModule } from "../apps/tauri/capabilities/file-system/module.ts";
import { NodeTerminalSessionsGateway } from "../apps/tauri/capabilities/terminal/gateways/terminal-sessions/node.gateway.ts";
import { TerminalModule } from "../apps/tauri/capabilities/terminal/module.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import { tasksBoardFileOver } from "../apps/tauri/src/core-link/tasks-board-file.ts";
import { PlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { placedTabsOf } from "./places-fixture.ts";
import { seededBoard } from "./tasks-fixture.ts";
import { REGISTERED_APPS } from "../packages/shared/app-registry/index.ts";
import { APP_MODULES } from "../packages/shared/app-registry/modules.ts";
import { APP_REGISTRY_PACKAGE, appRegistryFilesOf } from "../packages/shared/cli/src/apps-registry.ts";
import { framePolicyServedFrom } from "./frame-policy.ts";
import { paged, waitUntil } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { TERMINAL_FACE } from "./plugin-apps-fixture.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";
import {
	SUMI_APP_IDS,
	SUMI_APPS_WORKSPACE,
	SUMI_CHAT_TAB,
	SUMI_PAGE_APPS,
	SUMI_VIEW_APPS,
	sumiTabOf,
} from "./sumi-apps-seed.ts";
import type { SumiAppId } from "./sumi-apps-seed.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

const GATE = "test:sumi-apps";
const WAIT_MS = 30_000;
const STEP_MS = 250;
const CONTENT_TYPES: Readonly<Record<string, string>> = {
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".json": "application/json",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".wasm": "application/wasm",
};

const PREBUILT = "SUMI_APPS_PREBUILT";
const NOT_AN_APP = "test:sumi-apps checks {named}, which is none of {apps}";
const TASKS_RELOAD_LAST: readonly SumiAppId[] = [...SUMI_APP_IDS.filter((app) => app !== "tasks"), "tasks"];
const CHECKED_APPS = checkedAppsOf(process.argv.slice(2));
const VITE = path.resolve("node_modules/vite/bin/vite.js");

function checkedAppsOf(named: readonly string[]): readonly SumiAppId[] {
	const unknown = named.find((each) => !TASKS_RELOAD_LAST.some((app) => app === each));

	if (unknown !== undefined) {
		throw new Error(NOT_AN_APP.replace("{named}", unknown).replace("{apps}", TASKS_RELOAD_LAST.join(", ")));
	}

	return named.length === 0 ? TASKS_RELOAD_LAST : TASKS_RELOAD_LAST.filter((app) => named.includes(app));
}

function buildFolderOf(app: string): string {
	const registered = REGISTERED_APPS.find(({ id }) => id === app);
	return path.resolve(registered === undefined ? path.join("apps", app, "dist") : registered.build);
}

function buildInMonorepo(app: SumiAppId): void {
	if (process.env[PREBUILT] === "1") {
		console.log(`${app}: ${PREBUILT}=1, the build in ${buildFolderOf(app)} is read as it is, not a check`);
		return;
	}

	execFileSync(process.execPath, [VITE, "build", "--logLevel", "warn"], {
		cwd: path.resolve("apps", app),
		stdio: ["ignore", "ignore", "inherit"],
	});
	check(
		`${app}: apps/${app} builds into the folder the registry serves`,
		existsSync(path.join(buildFolderOf(app), "index.html")),
		true,
	);
}

function registryChecks(): void {
	const folders = readdirSync("apps")
		.filter((folder) => existsSync(path.join("apps", folder, "sumi-app.json")))
		.sort();
	check(
		"the registry names every apps/* folder holding a sumi-app.json, and nothing else",
		REGISTERED_APPS.map(({ id }) => id),
		folders,
	);
	check(
		"the registry on disk is what widgetarium generate writes from apps/*",
		appRegistryFilesOf(process.cwd()).filter(
			({ entry, text }) => readFileSync(path.join(APP_REGISTRY_PACKAGE, entry), "utf8") !== text,
		),
		[],
	);
	check(
		"the core registers the modules the apps bring: tasks",
		APP_MODULES.map((each) => each.definition.name),
		["tasks"],
	);
}

function inScript(text: string): string {
	return text.replaceAll("</script", "<\\/script");
}

function listening(listener: RequestListener): Promise<{ readonly server: Server; readonly origin: string }> {
	const http = createServer(listener);
	return new Promise((listened) =>
		http.listen(0, "127.0.0.1", () => {
			const { port } = http.address() as AddressInfo;
			listened({
				server: http,
				origin: `http://127.0.0.1:${port}`,
			});
		}),
	);
}

const appData = mkdtempSync(path.join(tmpdir(), "wg-sumi-apps-"));
const terminal = new NodeTerminalSessionsGateway(appData);
const own = localTransport();
const served = server()
	.modules(
		FileSystemModule.with({
			files: new NodeFilesGateway(appData, SUMI_APPS_WORKSPACE),
		}),
		TerminalModule.with({
			sessions: terminal,
		}),
		TasksModule({
			file: tasksBoardFileOver(own),
		}),
		PlacesModule.with({
			windows: new MemoryWindowsGateway({
				windows: [],
			}),
			tabs: new MemoryTabsGateway(
				placedTabsOf(
					{
						tabs: SUMI_PAGE_APPS.map((app) => ({
							id: sumiTabOf(app),
							app,
							pageId: null,
							label: null,
							lastAddress: "",
						})),
						shownId: sumiTabOf("tasks"),
						minted: SUMI_PAGE_APPS.length,
						closed: [],
					},
					[SUMI_CHAT_TAB],
				),
			),
		}),
	)
	.listen(own)
	.start({
		env: {},
		scope: {
			workspaceId: SUMI_APPS_WORKSPACE,
		},
		host: {
			authenticate: new AppCallerAuthenticate(),
		},
	});

registryChecks();
for (const app of CHECKED_APPS.filter((checked) => !SUMI_VIEW_APPS.includes(checked))) {
	buildInMonorepo(app);
}

const WEB_PAGE_APP: SumiAppId = "browser-page";
function appFileOf(pathname: string): { readonly app: string; readonly file: string } | null {
	const asked = /^\/apps\/([a-z][a-z0-9-]*)\/(.+)$/.exec(pathname);
	const app = asked?.[1];
	const relative = asked?.[2];

	if (app === undefined || relative === undefined || relative.includes("..")) {
		return null;
	}

	if (!REGISTERED_APPS.some(({ id }) => id === app)) {
		return null;
	}

	const file = path.join(buildFolderOf(app), relative);
	return existsSync(file)
		? {
				app,
				file,
			}
		: null;
}

const apps = await listening(
	getRequestListener((request) => {
		const asked = appFileOf(new URL(request.url).pathname);

		if (asked === null) {
			return new Response("not found", {
				status: 404,
				headers: {
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		return new Response(readFileSync(asked.file), {
			headers: {
				"Content-Type": CONTENT_TYPES[path.extname(asked.file)] ?? "application/octet-stream",
				"Access-Control-Allow-Origin": "*",
				"Content-Security-Policy": framePolicyServedFrom(asked.app, apps.origin),
				"X-Content-Type-Options": "nosniff",
			},
		});
	}),
);
const bundle = await bundleOf("tools/sumi-apps-page.ts");
const studioSheets = BROWSER_SHEET_SOURCES.map((at) => readFileSync(at, "utf8")).join("\n");
const shellPage = `<!doctype html><html><head><meta charset="utf-8">
<link rel="icon" href="data:,"><style>${studioSheets}</style><style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>${inScript(`window.__SUMI_APP_ORIGIN__ = ${JSON.stringify(apps.origin)};`)}</script>
<script>${inScript(bundle)}</script></body></html>`;
const core = await listening(
	getRequestListener((request) => {
		if (new URL(request.url).pathname === "/") {
			return new Response(shellPage, {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
				},
			});
		}

		return served.fetch(request);
	}),
);
const CORE_RPC = `${core.origin}/rpc`;

function framePartOf(app: string): string {
	return `/apps/${app}/`;
}

async function inFrame(page: AskedPage, app: string, expression: string): Promise<unknown> {
	return page.askInFrame(framePartOf(app), expression).catch((failure: unknown) => `unreached: ${String(failure)}`);
}

async function frameSees(page: AskedPage, app: string, expression: string): Promise<boolean> {
	return waitUntil(async () => (await inFrame(page, app, expression)) === true, WAIT_MS, STEP_MS);
}

const APP_DRAWN: Readonly<Record<SumiAppId, string>> = {
	tasks: "[data-tasks-card], [data-tasks-page]",
	terminal: ".wg-terminal-screen",
	"browser-page": "[data-browser-page-state], .wg-browser-page-area",
	chat: "textarea",
};

async function frameOpens(page: AskedPage, app: SumiAppId): Promise<void> {
	const isDrawn = await waitUntil(
		async () =>
			(await page.ask(`document.querySelector('iframe[data-app-frame-src*="${framePartOf(app)}"]') !== null`)) === true,
		WAIT_MS,
		STEP_MS,
	);
	check(`${app}: the studio draws the registered app frame in its tab, with no install`, isDrawn, true);
	check(
		`${app}: the frame is sandboxed allow-scripts allow-forms`,
		await page.ask(
			`document.querySelector('iframe[data-app-frame-src*="${framePartOf(app)}"]')?.getAttribute("sandbox")`,
		),
		APP_FRAME_SANDBOX,
	);
	const isStarted = await frameSees(page, app, `document.querySelector(${JSON.stringify(APP_DRAWN[app])}) !== null`);
	check(`${app}: the app drew its own view inside its frame`, isStarted, true);
	check(`${app}: the frame runs in an opaque origin`, await inFrame(page, app, "origin"), "null");
	check(
		`${app}: the frame cannot reach the core's /rpc itself`,
		await inFrame(
			page,
			app,
			`fetch(${JSON.stringify(CORE_RPC)}, { method: "POST", mode: "no-cors" }).then(() => "reached", () => "refused")`,
		),
		"refused",
	);
}

const TASK_ACCEPTED = "T-147";
const TERMINAL_LINE = "echo sumi-e2e-$((40+2))";
const TERMINAL_SAID = "sumi-e2e-42";
const TERMINAL_SCREEN = ".wg-terminal-screen";
const TERMINAL_KEYS = "textarea.xterm-helper-textarea";
const WEB_ADDRESS = "https://example.com/";
const CHAT_SAID = "hello from the e2e";

function tasksFileOf(): string {
	return path.join(appData, "app-data", SUMI_APPS_WORKSPACE, "tasks", "tasks.json");
}

function seedTasksFile(): void {
	mkdirSync(path.dirname(tasksFileOf()), {
		recursive: true,
	});
	writeFileSync(
		tasksFileOf(),
		JSON.stringify({
			rev: 1,
			board: seededBoard(Date.now()),
		}),
	);
}

function statusOnDisk(taskNumber: number): unknown {
	const kept: unknown = JSON.parse(readFileSync(tasksFileOf(), "utf8"));
	const board = typeof kept === "object" && kept !== null ? Reflect.get(kept, "board") : null;
	const tasks: unknown = typeof board === "object" && board !== null ? Reflect.get(board, "tasks") : null;
	const task: unknown = Array.isArray(tasks)
		? tasks.find((row: unknown) => typeof row === "object" && row !== null && Reflect.get(row, "number") === taskNumber)
		: null;
	return typeof task === "object" && task !== null ? Reflect.get(task, "status") : null;
}

async function pressInFrame(page: AskedPage, app: string, selector: string): Promise<boolean> {
	const frameBox = await page.ask(
		`(() => { const box = document.querySelector('iframe[data-app-frame-src*="${framePartOf(app)}"]')?.getBoundingClientRect(); return box ? [box.x, box.y] : null; })()`,
	);
	const box = await inFrame(
		page,
		app,
		`(() => { const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((each) => each.getClientRects().length > 0); target?.scrollIntoView({ block: "center", inline: "center" }); const box = target?.getBoundingClientRect(); return box ? [box.x + box.width / 2, box.y + box.height / 2] : null; })()`,
	);

	if (!Array.isArray(frameBox) || !Array.isArray(box)) {
		return false;
	}

	await page.press(Number(frameBox[0]) + Number(box[0]), Number(frameBox[1]) + Number(box[1]));
	return true;
}

interface TypingReach {
	readonly page: AskedPage;
	readonly sees: (expression: string) => Promise<boolean>;
	readonly press: (selector: string) => Promise<boolean>;
	readonly ask: (expression: string) => Promise<unknown>;
}

async function typedThrough({ page, sees, press, ask }: TypingReach, selector: string, text: string): Promise<boolean> {
	const target = JSON.stringify(selector);

	if (!(await sees(`document.querySelector(${target}) !== null`))) {
		return false;
	}

	await press(selector);
	const isFocused = (await ask(`document.activeElement === document.querySelector(${target})`)) === true;

	if (!isFocused) {
		await ask(`document.querySelector(${target}).focus()`);
	}

	await page.typeText(text);
	await page.pressEnter();
	return isFocused;
}

async function typedInFrame(page: AskedPage, app: string, selector: string, text: string): Promise<boolean> {
	return typedThrough(
		{
			page,
			sees: (expression) => frameSees(page, app, expression),
			press: (pressed) => pressInFrame(page, app, pressed),
			ask: (expression) => inFrame(page, app, expression),
		},
		selector,
		text,
	);
}

async function typedOnPage(page: AskedPage, selector: string, text: string): Promise<boolean> {
	return typedThrough(
		{
			page,
			sees: (expression) => pageSees(page, expression),
			press: (pressed) => pressOnPage(page, pressed),
			ask: (expression) => page.ask(expression),
		},
		selector,
		text,
	);
}

async function showAppTab(page: AskedPage, app: SumiAppId): Promise<void> {
	await page.ask(`window.__sumiApps.showTab(${JSON.stringify(sumiTabOf(app))})`);
	await (SUMI_VIEW_APPS.includes(app) ? viewOpens(page, app) : frameOpens(page, app));
}

async function viewOpens(page: AskedPage, app: SumiAppId): Promise<void> {
	const isDrawn = await pageSees(page, `document.querySelector(${JSON.stringify(APP_DRAWN[app])}) !== null`);
	check(
		`${app}: the studio draws the plugin's view in its tab, with no frame`,
		[isDrawn, await page.ask(`document.querySelector('iframe[data-app-frame-src*="${framePartOf(app)}"]') === null`)],
		[true, true],
	);
}

async function pageSees(page: AskedPage, expression: string): Promise<boolean> {
	return waitUntil(async () => (await page.ask(expression)) === true, WAIT_MS, STEP_MS);
}

async function pressOnPage(page: AskedPage, selector: string): Promise<boolean> {
	const box = await page.ask(
		`(() => { const box = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return box ? [box.x + box.width / 2, box.y + box.height / 2] : null; })()`,
	);

	if (!Array.isArray(box)) {
		return false;
	}

	await page.press(Number(box[0]), Number(box[1]));
	return true;
}

const MENU_ASKS = ["", "install", "update", "tasks", "chat"];

async function nothingAsksToInstall(page: AskedPage): Promise<void> {
	const said = await Promise.all(
		MENU_ASKS.map(async (text) =>
			JSON.stringify(await page.ask(`window.__sumiApps.menuResults(${JSON.stringify(text)})`)),
		),
	);
	check(
		"the command menu answers every ask with no Install row and no Update apps",
		said.filter((answer) => /"title":"(Install |Update apps)/.test(answer) || answer.includes("refused")),
		[],
	);
	check(
		"no page of the studio offers to install an app",
		await page.ask(`[...document.querySelectorAll("button")].some((each) => /^Install /.test(each.textContent ?? ""))`),
		false,
	);
}

async function studioStarts(page: AskedPage): Promise<void> {
	const isStarted = await waitUntil(
		async () => (await page.ask("window.__sumiApps !== undefined")) === true,
		WAIT_MS,
		STEP_MS,
	);
	check("the studio page started", isStarted, true);
}

async function tasksChecks(page: AskedPage): Promise<void> {
	await showAppTab(page, "tasks");
	const card = `[data-tasks-card="${TASK_ACCEPTED}"]`;
	check(
		"tasks: the board draws the tasks.json it read through file-system",
		await frameSees(page, "tasks", `document.querySelector('${card}') !== null`),
		true,
	);
	await pressInFrame(page, "tasks", card);
	const isOpened = await frameSees(page, "tasks", `document.querySelector("[data-tasks-accept]") !== null`);
	check("tasks: pressing the card, a plain anchor, opens the task with its Accept", isOpened, true);
	check(
		`tasks: the shell's crumb reads Tasks / ${TASK_ACCEPTED}`,
		await crumbSays(page, ["Tasks", TASK_ACCEPTED]),
		true,
	);
	check(
		"tasks: the app draws no header of its own (no crumb, no back)",
		await inFrame(
			page,
			"tasks",
			`document.querySelector(".wg-plate-crumb, [aria-label='Back to the board']") === null`,
		),
		true,
	);
	check(
		"tasks: the frame draws no plate or header row of its own",
		await inFrame(page, "tasks", `document.querySelector(".wg-plate-head, .wg-app-plate") === null`),
		true,
	);
	await pressInFrame(page, "tasks", "[data-tasks-accept]");
	await waitUntil(() => Promise.resolve(statusOnDisk(147) === "done"), WAIT_MS, STEP_MS);
	check("tasks: Accept writes the task as done into tasks.json on disk", statusOnDisk(147), "done");
	await page.ask("location.reload()");
	await studioStarts(page);
	await showAppTab(page, "tasks");
	check(
		"tasks: the reloaded frame reopens the task page it was on and draws the task as done, read back from disk",
		await frameSees(
			page,
			"tasks",
			`(() => { const shown = document.querySelector('[data-tasks-page="${TASK_ACCEPTED}"]'); const glyphs = shown === null ? [] : [...shown.querySelectorAll(".wg-tasks-st:not([data-leaving])")]; return glyphs.length > 0 && glyphs.every((glyph) => glyph.getAttribute("data-status") === "done") && shown.querySelector("[data-tasks-accept]") === null; })()`,
		),
		true,
	);
	await tasksHistoryChecks(page);
	await tasksThemeChecks(page);
	await tasksLinkChecks(page);
}

const CRUMB_WORDS = `[...document.querySelectorAll(".wg-plate-head.is-app [data-plate-crumb] :is(.wg-plate-crumb-first, .wg-plate-crumb-second)")].filter((each) => each.getClientRects().length > 0).map((each) => each.textContent)`;
const TASKS_BOARD = `document.querySelector('[data-tasks-page="board"]') !== null`;
const PLAIN_TASK = "T-140";
const BLANK_TASK = "T-141";
const WEB_LINK = "https://example.org/e2e";
const E2E_LINKS = `<div style="position:fixed;left:8px;bottom:8px;z-index:9;display:flex;gap:16px;padding:8px;background:white"><a id="e2e-plain" href="/${PLAIN_TASK}">plain</a><a id="e2e-deep" href="sumi://tasks/${TASK_ACCEPTED}">deep</a><a id="e2e-web" href="${WEB_LINK}">web</a><a id="e2e-blank" href="/${BLANK_TASK}" target="_blank">blank</a></div>`;

async function crumbSays(page: AskedPage, words: readonly string[]): Promise<boolean> {
	return waitUntil(async () => JSON.stringify(await page.ask(CRUMB_WORDS)) === JSON.stringify(words), WAIT_MS, STEP_MS);
}

async function pressInPage(page: AskedPage, selector: string): Promise<boolean> {
	const box = await page.ask(
		`(() => { const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((each) => each.getClientRects().length > 0); const box = target?.getBoundingClientRect(); return box ? [box.x + box.width / 2, box.y + box.height / 2] : null; })()`,
	);

	if (!Array.isArray(box)) {
		return false;
	}

	await page.press(Number(box[0]), Number(box[1]));
	return true;
}

async function tasksHistoryChecks(page: AskedPage): Promise<void> {
	await pressInPage(page, "[data-app-back]");
	check(
		"tasks: the shell's back returns the frame to the board",
		[await frameSees(page, "tasks", TASKS_BOARD), await crumbSays(page, ["Tasks"])],
		[true, true],
	);
	await pressInPage(page, "[data-app-forward]");
	check(
		"tasks: the shell's forward returns the frame to the task",
		[
			await frameSees(page, "tasks", `document.querySelector('[data-tasks-page="task"]') !== null`),
			await crumbSays(page, ["Tasks", TASK_ACCEPTED]),
		],
		[true, true],
	);
	check(
		"tasks: the whole crumb is one button, with no separate home part",
		await page.ask(
			`(() => { const shown = [...document.querySelectorAll(".wg-plate-head.is-app [data-plate-crumb]")].filter((each) => each.getClientRects().length > 0); return [shown.length, shown[0]?.querySelectorAll("button").length ?? null, shown[0]?.tagName ?? null]; })()`,
		),
		[1, 0, "BUTTON"],
	);
	await pressInPage(page, ".wg-plate-head.is-app [data-plate-crumb]");
	check(
		"tasks: pressing the crumb opens the address field",
		await waitUntil(
			async () => (await page.ask(`document.querySelector("[data-cm-mode]") !== null`)) === true,
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
	check(
		`tasks: the address field holds the tab's deep link sumi://tasks/${TASK_ACCEPTED}`,
		await page.ask(`document.querySelector(".wg-cm-input")?.value ?? null`),
		`sumi://tasks/${TASK_ACCEPTED}`,
	);
	await pressInPage(page, ".wg-plate-head.is-app [data-plate-crumb]");
	check(
		"tasks: pressing the crumb again shuts the address field",
		await waitUntil(
			async () => (await page.ask(`document.querySelector("[data-cm-mode]") === null`)) === true,
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
}

async function tasksThemeChecks(page: AskedPage): Promise<void> {
	const isDark = `document.documentElement.classList.contains("dark")`;
	const wasLight = await frameSees(page, "tasks", `!${isDark}`);
	await page.ask(`window.__sumiApps.chooseTheme("dark")`);
	const turnedDark = await frameSees(page, "tasks", isDark);
	await page.ask(`window.__sumiApps.chooseTheme("light")`);
	const turnedLight = await frameSees(page, "tasks", `!${isDark}`);
	await page.ask(`window.__sumiApps.chooseTheme("system")`);
	check(
		"tasks: switching Sumi's theme in the studio flips the app frame's theme, both ways",
		[wasLight, turnedDark, turnedLight],
		[true, true, true],
	);
}

interface TabRow {
	readonly id: string;
	readonly app: string;
	readonly address: string | null;
	readonly isShown: boolean;
}

async function tabRowsOf(page: AskedPage): Promise<readonly TabRow[]> {
	const answer = await page.ask("window.__sumiApps.tabs()");
	const tabs: unknown = typeof answer === "object" && answer !== null ? Reflect.get(answer, "tabs") : null;
	return Array.isArray(tabs) ? tabs.filter(isTabRow) : [];
}

function isTabRow(row: unknown): row is TabRow {
	return typeof row === "object" && row !== null && typeof Reflect.get(row, "id") === "string";
}

async function shownTabIs(page: AskedPage, isWanted: (row: TabRow) => boolean): Promise<boolean> {
	const isShown = await waitUntil(
		async () => (await tabRowsOf(page)).some((row) => row.isShown && isWanted(row)),
		WAIT_MS,
		STEP_MS,
	);

	if (!isShown) {
		console.log("tabs, not a check:", JSON.stringify(await tabRowsOf(page)));
	}

	return isShown;
}

async function webLinkChecks(page: AskedPage): Promise<void> {
	await pressInFrame(page, "tasks", "#e2e-web");
	const drawn = `[...document.querySelectorAll('[data-app-view="${WEB_PAGE_APP}"]')].some((each) => each.getClientRects().length > 0)`;
	check(
		`tasks: an https link opens a shown ${WEB_PAGE_APP} tab at that address, drawn as the plugin's view`,
		[
			await shownTabIs(page, (row) => row.app === WEB_PAGE_APP && row.address === WEB_LINK),
			await waitUntil(async () => (await page.ask(drawn)) === true, WAIT_MS, STEP_MS),
		],
		[true, true],
	);
	await page.ask(`window.__sumiApps.showTab(${JSON.stringify(sumiTabOf("tasks"))})`);
	await crumbSays(page, ["Tasks", TASK_ACCEPTED]);
}

async function tasksLinkChecks(page: AskedPage): Promise<void> {
	const tasksTabs = async (): Promise<number> => (await tabRowsOf(page)).filter((row) => row.app === "tasks").length;
	const before = await tasksTabs();
	await inFrame(page, "tasks", `document.body.insertAdjacentHTML("beforeend", ${JSON.stringify(E2E_LINKS)})`);
	await pressInFrame(page, "tasks", "#e2e-plain");
	check(
		`tasks: a plain <a href="/${PLAIN_TASK}"> navigates in the same tab`,
		[await crumbSays(page, ["Tasks", PLAIN_TASK]), await tasksTabs()],
		[true, before],
	);
	await pressInFrame(page, "tasks", "#e2e-deep");
	check(`tasks: sumi://tasks/${TASK_ACCEPTED} opens that task`, await crumbSays(page, ["Tasks", TASK_ACCEPTED]), true);
	await webLinkChecks(page);
	await pressInFrame(page, "tasks", "#e2e-blank");
	check(
		`tasks: a target=_blank link opens a new tasks tab at ${BLANK_TASK}`,
		[
			await shownTabIs(
				page,
				(row) => row.app === "tasks" && row.id !== sumiTabOf("tasks") && row.address === BLANK_TASK,
			),
			await tasksTabs(),
		],
		[true, before + 1],
	);
}

async function typedOnTerminalScreen(page: AskedPage): Promise<boolean> {
	const isDrawn = await pageSees(page, `document.querySelector(${JSON.stringify(TERMINAL_KEYS)}) !== null`);

	if (!isDrawn) {
		return false;
	}

	await pressOnPage(page, TERMINAL_SCREEN);
	const isFocused = await pageSees(
		page,
		`document.activeElement === document.querySelector(${JSON.stringify(TERMINAL_KEYS)})`,
	);
	await page.typeText(TERMINAL_LINE);
	await page.pressEnter();
	return isFocused;
}

async function terminalChecks(page: AskedPage): Promise<void> {
	await showAppTab(page, "terminal");
	check("terminal: pressing the screen focuses its keyboard input", await typedOnTerminalScreen(page), true);
	check(
		"terminal: the view draws what the real /bin/sh answered",
		await pageSees(
			page,
			`document.querySelector(${JSON.stringify(TERMINAL_SCREEN)})?.innerText.includes(${JSON.stringify(TERMINAL_SAID)}) === true`,
		),
		true,
	);
	await page.ask(`window.__sumiApps.showTab(${JSON.stringify(sumiTabOf("tasks"))})`);
	await page.ask(`window.__sumiApps.showTab(${JSON.stringify(sumiTabOf("terminal"))})`);
	check(
		"terminal: its tab row draws the terminal plugin's own SVG (demo: re-read by showing the tab again; the desktop re-reads on the core's change signal)",
		await pageSees(
			page,
			`document.querySelector('[data-tabs-id="${sumiTabOf("terminal")}"] [data-host-tab-favicon]')?.getAttribute("src") === ${JSON.stringify(TERMINAL_FACE.iconUrl)}`,
		),
		true,
	);
	check(
		"terminal: the menu offers it with the terminal plugin's own SVG",
		JSON.stringify(await page.ask(`window.__sumiApps.menuResults("terminal")`)).includes(
			JSON.stringify(TERMINAL_FACE.iconUrl).slice(1, -1),
		),
		true,
	);
}

const BROWSER_ANCHOR_SELECTOR = `[data-page-anchor-tab="${sumiTabOf("browser-page")}"]`;

async function browserPageChecks(page: AskedPage): Promise<void> {
	await showAppTab(page, "browser-page");
	check(
		"browser-page: pressing the address field focuses it",
		await typedOnPage(page, 'input[aria-label="Search or type an address"]', WEB_ADDRESS),
		true,
	);
	check(
		"browser-page: WebPageQuery (memory fake) answers the opened page, settled",
		await pageSees(
			page,
			`document.querySelector(".wg-browser-page-area:not([data-loading]) [data-browser-pages]") !== null`,
		),
		true,
	);
	check(
		"browser-page: the native page's anchor is the view's own container, the one the page area is measured in",
		await page.ask(
			`(() => { const anchor = document.querySelector(${JSON.stringify(BROWSER_ANCHOR_SELECTOR)}); const root = document.querySelector("[data-browser-root]"); return anchor?.tagName === "DIV" && anchor.contains(root) && ["x", "y"].every((side) => anchor.getBoundingClientRect()[side] === root.getBoundingClientRect()[side]); })()`,
		),
		true,
	);
	check(
		"browser-page: the shell's crumb reads Browser / example.com",
		await crumbSays(page, ["Browser", "example.com"]),
		true,
	);
	await browserActionChecks(page);
	const isRecorded = await waitUntil(
		async () =>
			JSON.stringify(await page.ask(`window.__sumiApps.tab(${JSON.stringify(sumiTabOf("browser-page"))})`)).includes(
				"example.com",
			),
		WAIT_MS,
		STEP_MS,
	);
	check("browser-page: the tab's address in Places names the page the app opened", isRecorded, true);
}

async function browserActionChecks(page: AskedPage): Promise<void> {
	const tabOfBrowser = `window.__sumiApps.tab(${JSON.stringify(sumiTabOf("browser-page"))})`;
	check(
		"browser-page: the shell's header draws the app's Reload action",
		await waitUntil(
			async () => (await page.ask(`document.querySelector('[data-app-action="reload"]') !== null`)) === true,
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
	check(
		"browser-page: the view draws no plate or header row of its own",
		await page.ask(`document.querySelector("[data-browser-root] :is(.wg-plate-head, .wg-app-plate)") === null`),
		true,
	);
	await pressInPage(page, '[data-app-action="reload"]');
	check(
		"browser-page: the app takes the Reload press, so none waits in Places",
		await waitUntil(
			async () => JSON.stringify(await page.ask(tabOfBrowser)).includes('"presses":[]'),
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
}

async function chatChecks(page: AskedPage): Promise<void> {
	await page.ask("window.__sumiApps.openChat()");
	await frameOpens(page, "chat");
	await chatCrumbChecks(page);
	check("chat: pressing the composer focuses it", await typedInFrame(page, "chat", "textarea", CHAT_SAID), true);
	check(
		"chat: the app draws the echo fake agent's answer",
		await frameSees(page, "chat", `document.body.innerText.includes(${JSON.stringify(`echo: ${CHAT_SAID}`)})`),
		true,
	);
	await chatLookChecks(page);
}

const CHAT_CRUMB = ".wg-plate-head.is-chat [data-ws-crumb]";

async function chatCrumbChecks(page: AskedPage): Promise<void> {
	check(
		"chat: the header crumb is one button holding workspace / chat",
		await waitUntil(
			async () =>
				(await page.ask(
					`(() => { const crumb = document.querySelector(${JSON.stringify(CHAT_CRUMB)}); return crumb?.tagName === "BUTTON" && crumb.querySelector(".wg-plate-crumb-first") !== null && crumb.querySelector(".wg-plate-crumb-second") !== null; })()`,
				)) === true,
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
	await pressInPage(page, CHAT_CRUMB);
	check(
		"chat: pressing the crumb fills the address field with sumi://chat/<id>",
		await waitUntil(
			async () =>
				String(await page.ask(`document.querySelector(".wg-cm-input")?.value ?? ""`)).startsWith("sumi://chat/"),
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
	await pressInPage(page, CHAT_CRUMB);
	await waitUntil(
		async () => (await page.ask(`document.querySelector("[data-cm-mode]") === null`)) === true,
		WAIT_MS,
		STEP_MS,
	);
}

type ChatTheme = "light" | "dark";
type ChatLook = Readonly<Record<string, readonly number[] | string>>;

const CHAT_LOOK_SAID = [
	"Here is [the docs](sumi://tasks/T-147) and `npm test`.",
	"Steps:\n\n- one\n- two\n- three",
	"Last one, plain words.",
];
const BOX_TOLERANCE_PX = 1;
const INTER = `"Inter Variable", Inter, -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif`;
const JETBRAINS_MONO = `"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace`;
const BUILTIN_CHAT_BOXES: ChatLook = {
	chat: [0, 0, 1108, 840],
	column: [170, 0, 768, 704],
	firstTurn: [194, -77, 720, 74],
	turnGaps: [14, 14, 14, 14, 14, 14, 14],
	composerGap: [57],
	composer: [170, 720, 768, 120],
	field: [186, 720, 736, 80],
	list: "20px | 12px | 0px",
};
const REFERENCE_CHAT_LOOK_AT_BUILTIN_TAG: Readonly<Record<ChatTheme, ChatLook>> = {
	light: {
		...BUILTIN_CHAT_BOXES,
		background: "rgb(255, 255, 255)",
		answerFont: `${INTER} | 14px | 22.4px | 400 | -0.078px | rgb(29, 29, 31)`,
		mineFont: `${INTER} | 14px | 21.7px | 400 | -0.078px | rgb(29, 29, 31)`,
		mineFill: "rgba(0, 0, 0, 0.06)",
		codeFont: `${JETBRAINS_MONO} | 12.5px | 20px | 400 | -0.078px | oklch(0.2316 0 268.26) | oklch(0.9761 0 268.26)`,
		link: "oklch(0.2316 0 268.26) | underline | oklch(0.2316 0 268.26) | 3px | 400",
	},
	dark: {
		...BUILTIN_CHAT_BOXES,
		background: "rgb(31, 31, 31)",
		answerFont: `${INTER} | 14px | 22.4px | 400 | -0.078px | rgb(237, 237, 237)`,
		mineFont: `${INTER} | 14px | 21.7px | 400 | -0.078px | rgb(237, 237, 237)`,
		mineFill: "rgba(255, 255, 255, 0.09)",
		codeFont: `${JETBRAINS_MONO} | 12.5px | 20px | 400 | -0.078px | oklch(0.9461 0 268.26) | oklch(0.2686 0 268.26)`,
		link: "oklch(0.9461 0 268.26) | underline | oklch(0.9461 0 268.26) | 3px | 400",
	},
};
const CHAT_FRAME_IN_PLATE = `(() => { const plate = document.querySelector('[data-shell-plate="chat"] .wg-shell-plate-body').getBoundingClientRect(); const frame = document.querySelector('iframe[data-app-frame-src*="${framePartOf("chat")}"]'); const box = frame.getBoundingClientRect(); return [box.x + frame.clientLeft - plate.x, box.y + frame.clientTop - plate.y]; })()`;
const CHAT_LOOK = `(dx, dy) => {
	const view = document.defaultView;
	const boxOf = (element) => {
		const box = element.getBoundingClientRect();
		return [box.x + dx, box.y + dy, box.width, box.height].map((each) => Math.round(each));
	};
	const fillOf = (element) => {
		for (let at = element; at !== null; at = at.parentElement) {
			const fill = view.getComputedStyle(at).backgroundColor;
			if (fill !== "rgba(0, 0, 0, 0)") return fill;
		}
		return "none";
	};
	const fontOf = (element) => {
		const style = view.getComputedStyle(element);
		return [style.fontFamily, style.fontSize, style.lineHeight, style.fontWeight, style.letterSpacing, style.color].join(" | ");
	};
	const turns = [...document.querySelectorAll(".wg-studio-ai-turn")];
	const composer = document.querySelector(".wg-studio-ai-composer");
	const link = view.getComputedStyle(document.querySelector(".wg-studio-ai-said.is-markdown a"));
	const list = view.getComputedStyle(document.querySelector(".wg-studio-ai-said.is-markdown ul"));
	const code = document.querySelector(".wg-studio-ai-said.is-markdown code");
	const mine = document.querySelector(".wg-studio-ai-turn.is-mine .wg-studio-ai-said");
	return {
		chat: boxOf(document.querySelector(".wg-studio-ai")),
		column: boxOf(document.querySelector(".wg-studio-ai-scroll-frame")),
		firstTurn: boxOf(turns[0]),
		turnGaps: turns.slice(1).map((turn, at) => Math.round(turn.getBoundingClientRect().top - turns[at].getBoundingClientRect().bottom)),
		composerGap: [Math.round(composer.getBoundingClientRect().top - turns[turns.length - 1].getBoundingClientRect().bottom)],
		composer: boxOf(composer),
		field: boxOf(document.querySelector(".wg-studio-ai-field")),
		background: fillOf(document.querySelector(".wg-studio-ai-scroll")),
		answerFont: fontOf(document.querySelector(".wg-studio-ai-said.is-markdown p")),
		mineFont: fontOf(mine),
		mineFill: fillOf(mine),
		codeFont: fontOf(code) + " | " + fillOf(code),
		link: [link.color, link.textDecorationLine, link.textDecorationColor, link.textUnderlineOffset, link.fontWeight].join(" | "),
		list: [list.paddingLeft, list.marginTop, list.marginBottom].join(" | "),
	};
}`;

function isLookAlike(measured: unknown, wanted: readonly number[] | string): boolean {
	if (typeof wanted === "string") {
		return measured === wanted;
	}

	return (
		Array.isArray(measured) &&
		measured.length === wanted.length &&
		wanted.every((each, at) => Math.abs(Number(measured[at]) - each) <= BOX_TOLERANCE_PX)
	);
}

async function chatLookOf(page: AskedPage): Promise<unknown> {
	const offset = await page.ask(CHAT_FRAME_IN_PLATE);
	return Array.isArray(offset)
		? inFrame(page, "chat", `(${CHAT_LOOK})(${Number(offset[0])}, ${Number(offset[1])})`)
		: null;
}

function lookOf(measured: unknown, quantity: string): unknown {
	return typeof measured === "object" && measured !== null ? Reflect.get(measured, quantity) : undefined;
}

function isLookOfTag(measured: unknown, theme: ChatTheme): boolean {
	return Object.entries(REFERENCE_CHAT_LOOK_AT_BUILTIN_TAG[theme]).every(([quantity, wanted]) =>
		isLookAlike(lookOf(measured, quantity), wanted),
	);
}

async function chatLookChecks(page: AskedPage): Promise<void> {
	for (const [at, said] of CHAT_LOOK_SAID.entries()) {
		await typedInFrame(page, "chat", "textarea", said);
		await frameSees(page, "chat", `document.querySelectorAll(".wg-studio-ai-turn").length === ${(at + 2) * 2}`);
	}

	for (const theme of ["light", "dark"] as const) {
		await page.ask(`window.__sumiApps.chooseTheme(${JSON.stringify(theme)})`);
		const held: { measured: unknown } = {
			measured: null,
		};
		await waitUntil(
			async () => {
				held.measured = await chatLookOf(page);
				return isLookOfTag(held.measured, theme);
			},
			WAIT_MS,
			STEP_MS,
		);

		if (typeof held.measured !== "object") {
			console.log(`chat (${theme}) was not measured, not a check:`, held.measured);
		}

		for (const [quantity, wanted] of Object.entries(REFERENCE_CHAT_LOOK_AT_BUILTIN_TAG[theme])) {
			const measured = lookOf(held.measured, quantity);
			check(
				`chat (${theme}): ${quantity} is the built-in chat's at builtin-apps-before-removal`,
				isLookAlike(measured, wanted) ? wanted : measured,
				wanted,
			);
		}
	}

	await page.ask(`window.__sumiApps.chooseTheme("system")`);
}

function failureChecks(failures: readonly string[]): void {
	for (const app of CHECKED_APPS) {
		check(
			`${app}: no exception or console error came from its frame`,
			failures.filter((failure) => failure.includes(framePartOf(app))),
			[],
		);
	}

	const studioFailures = failures.filter((failure) => !failure.includes("/apps/"));
	check(
		"no exception was thrown in the studio page",
		studioFailures.filter((failure) => failure.startsWith("exception")),
		[],
	);
	console.log("console errors of the studio page, not a check:", studioFailures.length);
	studioFailures.forEach((failure) => console.log(`  ${failure.slice(0, 300)}`));
}

const CHECKS_OF_APP: Readonly<Record<SumiAppId, (page: AskedPage) => Promise<void>>> = {
	terminal: terminalChecks,
	"browser-page": browserPageChecks,
	chat: chatChecks,
	tasks: tasksChecks,
};
seedTasksFile();
const page = await paged(`${core.origin}/`, GATE, {
	size: [1400, 900],
	hasFramesInProcess: true,
	hearsFailures: true,
});

try {
	await studioStarts(page);
	await nothingAsksToInstall(page);
	for (const app of CHECKED_APPS) {
		await CHECKS_OF_APP[app](page);
	}
	check("nothing failed on the studio page", await page.ask(`document.getElementById("boom").textContent`), "");
	failureChecks(page.failures());
} finally {
	page.close();
	terminal.stopAll();
	core.server.close();
	apps.server.close();
	rmSync(appData, {
		recursive: true,
		force: true,
	});
}

console.log(tally.failed ? `sumi apps: ${tally.failed} check(s) failed` : "sumi apps: all checks passed");
process.exit(tally.failed ? 1 : 0);
