import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { paged, waitUntil } from "./chrome-ask.ts";
import { APP_FRAME_SANDBOX } from "../apps/studio/src/features/app-frame/lib/frame-sandbox.ts";
import { check, tally } from "./check-helpers.ts";
import { framePolicyServedFrom } from "./frame-policy.ts";

const GATE = "test:app-frame-sandbox";
const IPC_URLS = ["ipc://localhost/plugin:apps|installed", "http://ipc.localhost/plugin:apps|installed"];
const PROBE_MS = 10_000;

const PARENT = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
window.__TAURI_INTERNALS__ = { invoke: () => "the studio's invoke" };
window.__PROBE__ = null;
window.addEventListener("message", (event) => { window.__PROBE__ = event.data; });
const frame = document.createElement("iframe");
frame.setAttribute("sandbox", ${JSON.stringify(APP_FRAME_SANDBOX)});
frame.src = "/frame.html";
document.body.append(frame);
</script></body></html>`;

const FRAME = `<!doctype html><html><head><meta charset="utf-8"></head><body><script src="/probe.js"></script></body></html>`;

const PROBE = `(async () => {
	const throwsOn = (read) => { try { read(); return false; } catch { return true; } };
	const blocked = [];
	document.addEventListener("securitypolicyviolation", (event) => blocked.push(event.blockedURI));
	const reached = [];
	for (const url of ${JSON.stringify(IPC_URLS)}) {
		try { await fetch(url, { method: "POST" }); reached.push(url); } catch { }
	}
	await new Promise((settle) => setTimeout(settle, 300));
	parent.postMessage({
		parentThrows: throwsOn(() => parent.__TAURI_INTERNALS__.invoke),
		topThrows: throwsOn(() => top.__TAURI_INTERNALS__.invoke),
		ownInternals: typeof window.__TAURI_INTERNALS__,
		origin: String(self.origin),
		blocked,
		reached,
	}, "*");
})();`;

const server = createServer((request, response) => {
	const origin = `http://${request.headers.host ?? ""}`;

	if (request.url === "/frame.html") {
		response.writeHead(200, {
			"Content-Type": "text/html; charset=utf-8",
			"Content-Security-Policy": framePolicyServedFrom("probe", origin),
		});
		response.end(FRAME);
		return;
	}

	if (request.url === "/probe.js") {
		response.writeHead(200, {
			"Content-Type": "text/javascript; charset=utf-8",
		});
		response.end(PROBE);
		return;
	}

	response.writeHead(200, {
		"Content-Type": "text/html; charset=utf-8",
	});
	response.end(PARENT);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const { port } = server.address() as AddressInfo;
const page = await paged(`http://127.0.0.1:${port}/`, GATE, { size: [800, 600] });

try {
	await waitUntil(async () => (await page.ask("window.__PROBE__ !== null")) === true, PROBE_MS, 100);
	const probe = (await page.ask("window.__PROBE__")) as {
		parentThrows: boolean;
		topThrows: boolean;
		ownInternals: string;
		origin: string;
		blocked: string[];
		reached: string[];
	} | null;
	check("the frame cannot read the studio's __TAURI_INTERNALS__ through parent", probe?.parentThrows, true);
	check("the frame cannot read the studio's __TAURI_INTERNALS__ through top", probe?.topThrows, true);
	check("the frame has no __TAURI_INTERNALS__ of its own", probe?.ownInternals, "undefined");
	check("the frame runs in an opaque origin", probe?.origin, "null");
	check(
		"the frame policy refuses both IPC routes before they leave",
		IPC_URLS.map((url) => probe?.blocked.some((blocked) => url.startsWith(decodeURIComponent(blocked))) ?? false),
		[true, true],
	);
	check("no IPC route answered the frame", probe?.reached, []);
} finally {
	page.close();
	server.close();
}

console.log(
	tally.failed ? `app frame sandbox: ${tally.failed} check(s) failed` : "app frame sandbox: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
