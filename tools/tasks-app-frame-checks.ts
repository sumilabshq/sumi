import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import { APP_MANIFEST_FILE } from "@sumi/contract";
import type { ReleaseRead } from "../packages/state/app-installer/gateways/apps/apps.gateway.ts";
import { RELEASE_FILE } from "./app-release.ts";
import { paged, waitUntil } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { framePolicyServedFrom } from "./frame-policy.ts";
import { bundleOf } from "./harness.ts";
import { check } from "./check-helpers.ts";

const GATE = "test:app-installer";
const WAIT_MS = 20_000;
const STEP_MS = 250;
const RELEASE_FOLDER =
	process.env["SUMI_TASKS_RELEASE"] ?? path.join(homedir(), "Projects/Sumi/sumi-tasks/apps/web/dist");
const NO_RELEASE =
	"{folder} holds no tasks release: run pnpm build and pnpm release in sumi-tasks, or name one in SUMI_TASKS_RELEASE";
const APP_FILE = /^\/apps\/tasks\/0\.1\.0\/((?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*)$/;
const FRAME = "/apps/tasks/";
const READY_TASK_TITLE = "Drag a tab between windows";
const CONTENT_TYPES: Readonly<Record<string, string>> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
	".json": "application/json",
	".woff2": "font/woff2",
};

interface PageRead {
	readonly rev: number | string;
	readonly statuses: Readonly<Record<string, string>>;
	readonly tabs: readonly { readonly app: string; readonly address: string | null }[];
	readonly frame: string | null;
	readonly isBuiltIn: boolean;
}

export async function frameChecks(): Promise<void> {
	if (!existsSync(path.join(RELEASE_FOLDER, RELEASE_FILE))) {
		check("the built sumi-tasks release is there", NO_RELEASE.replace("{folder}", RELEASE_FOLDER), "");
		return;
	}

	const server = await servedPage();
	const { port } = server.address() as AddressInfo;
	const page = await paged(`http://127.0.0.1:${port}/`, GATE, { size: [1000, 760], hasFramesInProcess: true });

	try {
		const isStarted = await waitUntil(
			async () => (await page.ask("window.__tasksApp !== undefined")) === true,
			WAIT_MS,
			STEP_MS,
		);
		check("the page started", isStarted ? "" : await page.ask(`document.querySelector("#boom").textContent`), "");
		await installChecks(page);
		await persistChecks(page);
		await linkChecks(page);
		check("nothing on the page failed", await page.ask(`document.querySelector("#boom").textContent`), "");
	} finally {
		page.close();
		server.close();
	}
}

function releaseRead(): ReleaseRead {
	const manifestBytes = readFileSync(path.join(RELEASE_FOLDER, APP_MANIFEST_FILE));
	return {
		manifest: JSON.parse(manifestBytes.toString("utf8")),
		release: JSON.parse(readFileSync(path.join(RELEASE_FOLDER, RELEASE_FILE), "utf8")),
		manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
	};
}

async function servedPage(): Promise<Server> {
	const bundle = await bundleOf("tools/tasks-app-page.tsx");
	const pageHtml = `<!doctype html><html><head><meta charset="utf-8"></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>window.__TASKS_RELEASE__ = ${JSON.stringify(releaseRead())};</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const server = createServer((request, response) => {
		const asked = APP_FILE.exec(request.url ?? "");

		if (asked === null) {
			response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			response.end(pageHtml);
			return;
		}

		const file = asked[1] ?? "";
		const origin = `http://${request.headers.host ?? ""}`;
		response.writeHead(200, {
			"Content-Type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
			"Access-Control-Allow-Origin": "*",
			"Content-Security-Policy": framePolicyServedFrom("tasks", origin),
		});
		response.end(readFileSync(path.join(RELEASE_FOLDER, file)));
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	return server;
}

async function readOf(page: AskedPage): Promise<PageRead> {
	return (await page.ask("window.__tasksApp.read()")) as PageRead;
}

async function until(page: AskedPage, what: string, isMet: (read: PageRead) => boolean): Promise<PageRead> {
	const isSeen = await waitUntil(async () => isMet(await readOf(page)), WAIT_MS, STEP_MS);
	const read = await readOf(page);
	check(what, isSeen, true);

	if (!isSeen) {
		console.log(JSON.stringify(read));
	}

	return read;
}

async function untilInFrame(page: AskedPage, what: string, expression: string): Promise<void> {
	const isSeen = await waitUntil(async () => (await page.askInFrame(FRAME, expression)) === true, WAIT_MS, STEP_MS);
	check(what, isSeen, true);

	if (!isSeen) {
		console.log(String(await page.askInFrame(FRAME, "document.body?.innerText.slice(0, 600) ?? null")));
	}
}

function linkPressed(href: string): string {
	return `(() => {
		const link = document.createElement("a");
		link.href = ${JSON.stringify(href)};
		link.textContent = "link";
		document.querySelector(".wg-tasks-app").append(link);
		link.click();
		link.remove();
		return true;
	})()`;
}

async function installChecks(page: AskedPage): Promise<void> {
	await until(
		page,
		"before the install the tasks tab draws the built-in page",
		(read) => read.isBuiltIn && read.frame === null,
	);
	check("tasks installs from its folder row", await page.ask("window.__tasksApp.install()"), {
		id: "tasks",
		version: "0.1.0",
	});
	await until(
		page,
		"once installed, the tasks tab draws the installed frame instead of the built-in page",
		(read) => !read.isBuiltIn && read.frame?.includes("/apps/tasks/0.1.0/index.html") === true,
	);
	await untilInFrame(
		page,
		"the app draws T-147 from the shell's store, with its Accept",
		`document.body.innerText.includes(${JSON.stringify(READY_TASK_TITLE)}) && document.querySelector("[data-tasks-accept]") !== null`,
	);
}

async function persistChecks(page: AskedPage): Promise<void> {
	const before = await readOf(page);
	await page.askInFrame(FRAME, `(document.querySelector("[data-tasks-accept]").click(), true)`);
	const accepted = await until(
		page,
		"Accept pressed in the app lands in the shell's store",
		(read) => read.statuses["T-147"] === "done",
	);
	check("the app's write moved the shell's rev", Number(accepted.rev) > Number(before.rev), true);

	await page.ask(`(document.querySelector("iframe").dataset.loadedBefore = "", true)`);
	await page.ask("window.__tasksApp.reloadFrame()");
	await until(page, "the frame is drawn again", (read) => read.frame !== null);
	check(
		"the old frame is gone",
		await waitUntil(
			async () => (await page.ask(`document.querySelector("iframe[data-loaded-before]") === null`)) === true,
			WAIT_MS,
			STEP_MS,
		),
		true,
	);
	await untilInFrame(
		page,
		"after a reload the app reads T-147 accepted from the shell",
		`document.body.innerText.includes(${JSON.stringify(READY_TASK_TITLE)}) && document.querySelector("[data-tasks-accept]") === null`,
	);

	const held = await readOf(page);
	check(
		"a write over an older rev is answered stale with the rev now",
		await page.ask(`window.__tasksApp.writeOver(${Number(held.rev) - 1})`),
		{ ok: true, output: { ok: false, why: "stale", rev: held.rev } },
	);
	check("and nothing was written", (await readOf(page)).rev, held.rev);
}

async function linkChecks(page: AskedPage): Promise<void> {
	await page.askInFrame(FRAME, linkPressed("sumi://task/T-140"));
	await until(page, "a sumi:// link the app opens reaches Places as a tasks tab", (read) =>
		read.tabs.some((tab) => tab.app === "tasks" && tab.address === "T-140"),
	);
	await page.askInFrame(FRAME, linkPressed("https://example.com/from-tasks"));
	await until(page, "an https:// link the app opens reaches Places as a browser tab", (read) =>
		read.tabs.some((tab) => tab.app === "browser"),
	);
}
