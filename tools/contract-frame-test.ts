import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { getRequestListener } from "@hono/node-server";
import { server } from "@widgetarium/framework/server";
import { AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { NodeFilesGateway } from "../packages/domain/file-system/gateways/files/node.gateway.ts";
import { FileSystemModule } from "../packages/domain/file-system/module.ts";
import { PlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { placedTabsOf } from "./places-fixture.ts";
import { NodeTerminalSessionsGateway } from "../packages/domain/terminal/gateways/terminal-sessions/node.gateway.ts";
import { TerminalModule } from "../packages/domain/terminal/module.ts";
import { paged, waitUntil } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { bundleOf } from "./harness.ts";

const GATE = "test:contract-frame";
const WAIT_MS = 20_000;
const STEP_MS = 200;
const APP_PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body><script src="/app.js"></script></body></html>`;
const SHELL_PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body><script src="/shell.js"></script></body></html>`;

const appData = mkdtempSync(path.join(tmpdir(), "wg-contract-frame-"));
const terminal = new NodeTerminalSessionsGateway(appData);
const served = server()
	.modules(
		FileSystemModule.with({ files: new NodeFilesGateway(appData, "contract-frame") }),
		TerminalModule.with({ sessions: terminal }),
		PlacesModule.with({
			windows: new MemoryWindowsGateway({ windows: [] }),
			tabs: new MemoryTabsGateway(
				placedTabsOf({
					tabs: [
						{
							id: "t1",
							app: "notes",
							pageId: null,
							label: null,
							lastAddress: "/start",
						},
						{
							id: "c1",
							app: "chat",
							pageId: null,
							label: null,
						},
					],
					shownId: "t1",
					minted: 1,
					closed: [],
				}),
			),
		}),
	)
	.start({
		env: {},
		scope: { workspaceId: "contract-frame" },
		host: { authenticate: new AppCallerAuthenticate() },
	});
const scripts: Readonly<Record<string, string>> = {
	"/shell.js": await bundleOf("tools/contract-frame-shell.ts"),
	"/app.js": await bundleOf("tools/contract-frame-app.ts"),
};
const pages: Readonly<Record<string, string>> = {
	"/": SHELL_PAGE,
	"/app.html": APP_PAGE,
	"/chat.html": APP_PAGE,
};

const listener = getRequestListener((request) => {
	const { pathname } = new URL(request.url);
	const script = scripts[pathname];
	const page = pages[pathname];

	if (script !== undefined) {
		return new Response(script, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
	}

	if (page !== undefined) {
		return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
	}

	return served.fetch(request);
});
const http = createServer(listener);
await new Promise<void>((listening) => http.listen(0, "127.0.0.1", listening));
const { port } = http.address() as AddressInfo;
const page = await paged(`http://127.0.0.1:${port}/`, GATE, { size: [800, 600], hasFramesInProcess: true });

try {
	const settled = await waitUntil(
		async () => (await page.askInFrame("app.html", "document.body.dataset.frameResult !== undefined")) === true,
		WAIT_MS,
		STEP_MS,
	);
	const result: unknown = JSON.parse(
		String(await page.askInFrame("app.html", 'document.body.dataset.frameResult ?? "{}"')),
	);
	console.log(JSON.stringify(result));
	const told = result as Record<string, unknown>;
	const chatSettled = await waitUntil(
		async () => (await page.askInFrame("chat.html", "document.body.dataset.frameResult !== undefined")) === true,
		WAIT_MS,
		STEP_MS,
	);
	const chatTold = JSON.parse(
		String(await page.askInFrame("chat.html", 'document.body.dataset.frameResult ?? "{}"')),
	) as Record<string, unknown>;
	console.log(JSON.stringify(chatTold));
	check("the chat app settled inside its sandboxed frame", chatSettled, true);
	check("the app settled inside its sandboxed frame", settled, true);
	check("the frame runs in an opaque origin", told["origin"], "null");
	check("WriteFileCommand from the frame is answered ok", told["written"], true);
	check("ReadFileQuery reads back what the frame wrote", told["read"], "written by the frame");
	check(
		"the file lands in the app's own data folder on disk",
		readFileSync(path.join(appData, "app-data", "contract-frame", "notes", "notes", "today.txt"), "utf8"),
		"written by the frame",
	);
	check("a relative path climbing out of the app's folder is refused", told["climbed"], "refused");
	check("a Places request off the app allow-list is forbidden", told["closedTabs"], "forbidden");
	check("a tab that does not hold the app is forbidden", told["otherTab"], "forbidden");
	check("the app reads its own tab through Places", told["ownTab"], "/start");
	check(
		"the frame opens a web page and WebPageQuery reads it back (memory fake browser in the shell)",
		told["webPage"],
		"example.com",
	);
	check("a web page in a tab the app does not hold is forbidden", told["otherWebPage"], "forbidden");
	check(
		"a non-chat app that recorded a chat id as its address gets no assistant route",
		told["foreignChat"],
		"not-found",
	);
	check(
		"the chat app in a chat tab sends a message and ChatQuery reads the fake port's answer",
		chatTold["chat"],
		"echo: hello from the frame",
	);
	check("a chat request off the app list is forbidden", chatTold["pickedFolder"], "forbidden");
	check("SendTerminalCommand is answered ok", told["typed"], true);
	check(
		"the shell ran the typed line and TerminalOutputQuery reads its output",
		String(told["terminal"]).includes("sumi-42"),
		true,
	);
	check("changes reached the frame over the port", Number(told["changesHeard"]) > 0, true);
	check("a second document wanting a port in the same frame mount gets none", told["secondPort"], "refused");
	check("the relay answered the frame's calls", Number(await page.ask("window.relayAnswers")) > 0, true);
} finally {
	page.close();
	terminal.stopAll();
	http.close();
	rmSync(appData, { recursive: true, force: true });
}

console.log(tally.failed ? `contract frame: ${tally.failed} check(s) failed` : "contract frame: all checks passed");
process.exit(tally.failed ? 1 : 0);
