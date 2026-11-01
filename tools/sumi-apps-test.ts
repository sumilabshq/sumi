import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { RequestListener, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { getRequestListener } from "@hono/node-server";
import { server } from "@widgetarium/core/requests/server";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { APP_FRAME_SANDBOX } from "../apps/studio/src/features/app-frame/lib/frame-sandbox.ts";
import { NodeFilesGateway } from "../packages/domain/file-system/gateways/files/node.gateway.ts";
import { FileSystemModule } from "../packages/domain/file-system/module.ts";
import { NodeTerminalSessionsGateway } from "../packages/domain/terminal/gateways/terminal-sessions/node.gateway.ts";
import { TerminalModule } from "../packages/domain/terminal/module.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import type { BoardFile } from "../packages/domain/tasks/module.ts";
import { PlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { placedTabsOf } from "./places-fixture.ts";
import { seededBoard } from "./tasks-fixture.ts";
import { releaseReadOf } from "./app-release.ts";
import { framePolicyServedFrom } from "./frame-policy.ts";
import { paged, waitUntil } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";
import { SUMI_APP_IDS, SUMI_APPS_WORKSPACE, SUMI_CHAT_TAB, SUMI_PAGE_APPS, sumiTabOf } from "./sumi-apps-seed.ts";
import type { SumiAppId } from "./sumi-apps-seed.ts";

const GATE = "test:sumi-apps";
const WAIT_MS = 30_000;
const STEP_MS = 250;
const SUMI_ROOT = path.join(homedir(), "Projects", "Sumi");
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

function checkedAppsOf(named: readonly string[]): readonly SumiAppId[] {
	const unknown = named.find((each) => !TASKS_RELOAD_LAST.some((app) => app === each));

	if (unknown !== undefined) {
		throw new Error(NOT_AN_APP.replace("{named}", unknown).replace("{apps}", TASKS_RELOAD_LAST.join(", ")));
	}

	return named.length === 0 ? TASKS_RELOAD_LAST : TASKS_RELOAD_LAST.filter((app) => named.includes(app));
}

function repoOf(app: string): string {
	return path.join(SUMI_ROOT, `sumi-${app}`);
}

function distOf(app: string): string {
	return path.join(repoOf(app), "apps", "web", "dist");
}

function gitIn(repo: string, args: readonly string[]): string {
	return execFileSync("git", ["-C", repo, ...args], {
		encoding: "utf8",
	}).trim();
}

function releaseFromHead(app: SumiAppId): void {
	const repo = repoOf(app);

	if (process.env[PREBUILT] === "1") {
		console.log(`${app}: ${PREBUILT}=1, the release in ${distOf(app)} is read as it is, not a check`);
		return;
	}

	check(
		`${app}: the app repo has nothing uncommitted, so its release is built from HEAD`,
		gitIn(repo, ["status", "--porcelain"]),
		"",
	);
	for (const script of ["build", "release"]) {
		execFileSync("pnpm", [script], {
			cwd: repo,
			env: {
				...process.env,
				SUMI_SHELL: process.cwd(),
			},
			stdio: ["ignore", "ignore", "inherit"],
		});
	}
	console.log(`${app}: released from ${gitIn(repo, ["rev-parse", "--short", "HEAD"])}`);
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

function boardFileInMemory(): BoardFile {
	const held: { text: string | null } = {
		text: null,
	};
	return {
		read: () => Promise.resolve(held.text),
		write: (text) => {
			held.text = text;
			return Promise.resolve();
		},
	};
}

const appData = mkdtempSync(path.join(tmpdir(), "wg-sumi-apps-"));
const terminal = new NodeTerminalSessionsGateway(appData);
const served = server()
	.modules(
		FileSystemModule.with({
			files: new NodeFilesGateway(appData),
		}),
		TerminalModule.with({
			sessions: terminal,
		}),
		TasksModule,
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
	.start({
		env: {},
		scope: {
			workspaceId: SUMI_APPS_WORKSPACE,
		},
		host: {
			file: boardFileInMemory(),
			authenticate: new AppCallerAuthenticate(),
		},
	});

for (const app of CHECKED_APPS) {
	releaseFromHead(app);
}

const WEB_PAGE_APP: SumiAppId = "browser-page";
const IS_WEB_PAGE_INSTALLED = CHECKED_APPS.includes(WEB_PAGE_APP);
const LISTED_APPS = IS_WEB_PAGE_INSTALLED ? CHECKED_APPS : [...CHECKED_APPS, WEB_PAGE_APP];
const registry = LISTED_APPS.map((id) => ({
	id,
	path: distOf(id),
}));
const releases = Object.fromEntries(registry.map(({ path: folder }) => [folder, releaseReadOf(folder)]));
function appFileOf(pathname: string): { readonly app: string; readonly file: string } | null {
	const asked = /^\/apps\/([a-z][a-z0-9-]*)\/(\d+\.\d+\.\d+)\/(.+)$/.exec(pathname);
	const app = asked?.[1];
	const relative = asked?.[3];

	if (app === undefined || relative === undefined || relative.includes("..")) {
		return null;
	}

	const file = path.join(distOf(app), relative);
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
const studioSheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");
const shellPage = `<!doctype html><html><head><meta charset="utf-8">
<link rel="icon" href="data:,"><style>${studioSheets}</style><style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>${inScript(`window.__SUMI_APP_ORIGIN__ = ${JSON.stringify(apps.origin)}; window.__SUMI_REGISTRY__ = ${JSON.stringify(registry)}; window.__SUMI_RELEASES__ = ${JSON.stringify(releases)};`)}</script>
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
	canvas: "[data-canvas-view]",
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
	check(`${app}: the studio draws the installed app's frame in its tab`, isDrawn, true);
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
const WEB_ADDRESS = "https://example.com/";
const CHAT_SAID = "hello from the e2e";

function tasksFileOf(): string {
	return path.join(appData, "app-data", "tasks", "tasks.json");
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

async function typedInFrame(page: AskedPage, app: string, selector: string, text: string): Promise<boolean> {
	const target = JSON.stringify(selector);
	const isReached = await frameSees(page, app, `document.querySelector(${target}) !== null`);

	if (!isReached) {
		return false;
	}

	await pressInFrame(page, app, selector);
	const isFocused = (await inFrame(page, app, `document.activeElement === document.querySelector(${target})`)) === true;

	if (!isFocused) {
		await inFrame(page, app, `document.querySelector(${target}).focus()`);
	}

	await page.typeText(text);
	await page.pressEnter();
	return isFocused;
}

async function showAppTab(page: AskedPage, app: SumiAppId): Promise<void> {
	await page.ask(`window.__sumiApps.showTab(${JSON.stringify(sumiTabOf(app))})`);
	await frameOpens(page, app);
}

async function installAll(page: AskedPage): Promise<void> {
	for (const id of CHECKED_APPS) {
		check(
			`${id}: installs from its folder release`,
			await page.ask(`window.__sumiApps.install(${JSON.stringify(id)})`),
			{
				id,
				version: "0.1.0",
			},
		);
	}
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
	await pressInFrame(page, "tasks", "[data-tasks-accept]");
	await waitUntil(() => Promise.resolve(statusOnDisk(147) === "done"), WAIT_MS, STEP_MS);
	check("tasks: Accept writes the task as done into tasks.json on disk", statusOnDisk(147), "done");
	await page.ask("location.reload()");
	await studioStarts(page);
	check(
		"tasks: after the studio reloads, the reinstalled app answers the same version",
		await page.ask(`window.__sumiApps.install("tasks")`),
		{
			id: "tasks",
			version: "0.1.0",
		},
	);
	for (const id of CHECKED_APPS.filter((app) => app !== "tasks")) {
		await page.ask(`window.__sumiApps.install(${JSON.stringify(id)})`);
	}
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

const CRUMB_WORDS = `[...document.querySelectorAll("[data-plate-crumb-app], [data-plate-crumb-page]")].filter((each) => each.getClientRects().length > 0).map((each) => each.textContent)`;
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
	await pressInPage(page, "[data-plate-crumb-page]");
	check(
		"tasks: the crumb's page part opens the address field",
		await waitUntil(
			async () => (await page.ask(`document.querySelector("[data-cm-mode]") !== null`)) === true,
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
	await page.ask(
		`(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`,
	);
	await waitUntil(
		async () => (await page.ask(`document.querySelector("[data-cm-mode]") === null`)) === true,
		WAIT_MS,
		STEP_MS,
	);
	await pressInPage(page, "[data-plate-crumb-app]");
	check(
		"tasks: the crumb's app part takes the tab home",
		[await frameSees(page, "tasks", TASKS_BOARD), await crumbSays(page, ["Tasks"])],
		[true, true],
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
	const shownPart = IS_WEB_PAGE_INSTALLED
		? `iframe[src*="/${WEB_PAGE_APP}/"]`
		: `[data-app-missing="${WEB_PAGE_APP}"]:not([data-app-failed]) button`;
	const drawn = `[...document.querySelectorAll(${JSON.stringify(shownPart)})].some((each) => each.getClientRects().length > 0 && (each.tagName === "IFRAME" || each.textContent === "Install ${WEB_PAGE_APP}"))`;
	check(
		`tasks: an https link opens a shown ${WEB_PAGE_APP} tab at that address, drawn ${IS_WEB_PAGE_INSTALLED ? "as the app" : "with its Install"}`,
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

async function terminalChecks(page: AskedPage): Promise<void> {
	await showAppTab(page, "terminal");
	check(
		"terminal: pressing the Command field focuses it",
		await typedInFrame(page, "terminal", 'input[aria-label="Command"]', TERMINAL_LINE),
		true,
	);
	check(
		"terminal: the frame draws what the real /bin/sh answered",
		await frameSees(page, "terminal", `document.body.innerText.includes(${JSON.stringify(TERMINAL_SAID)})`),
		true,
	);
}

async function canvasChecks(page: AskedPage): Promise<void> {
	await showAppTab(page, "canvas");
	check(
		"canvas: the canvas view stands with a drawn canvas element of real size",
		await frameSees(
			page,
			"canvas",
			`(() => { const canvas = document.querySelector("[data-canvas-view] canvas"); return canvas !== null && canvas.width > 0 && canvas.height > 0; })()`,
		),
		true,
	);
}

async function browserPageChecks(page: AskedPage): Promise<void> {
	await showAppTab(page, "browser-page");
	check(
		"browser-page: pressing the address field focuses it",
		await typedInFrame(page, "browser-page", 'input[aria-label="Search or type an address"]', WEB_ADDRESS),
		true,
	);
	check(
		"browser-page: WebPageQuery (memory fake) answers the opened page, settled",
		await frameSees(
			page,
			"browser-page",
			`document.querySelector(".wg-browser-page-area:not([data-loading]) [data-browser-pages]") !== null`,
		),
		true,
	);
	check(
		"browser-page: the shell's crumb reads Browser / example.com",
		await crumbSays(page, ["Browser", "example.com"]),
		true,
	);
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

async function chatChecks(page: AskedPage): Promise<void> {
	await page.ask("window.__sumiApps.openChat()");
	await frameOpens(page, "chat");
	check("chat: pressing the composer focuses it", await typedInFrame(page, "chat", "textarea", CHAT_SAID), true);
	check(
		"chat: the app draws the echo fake agent's answer",
		await frameSees(page, "chat", `document.body.innerText.includes(${JSON.stringify(`echo: ${CHAT_SAID}`)})`),
		true,
	);
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
	canvas: canvasChecks,
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
	await installAll(page);
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
