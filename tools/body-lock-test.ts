import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bodyLockFindingsOf, leavesWindowAlone } from "./body-lock-checks.ts";
import { bundleOf } from "./harness.ts";

const bundle = await bundleOf("tools/body-lock-page.tsx");
const PAGE = `<!doctype html><html><body><div id="root"></div><pre id="boom"></pre><script>${bundle}</script></body></html>`;

const DRAW = (widget: string): string => `window.__DRAW__(${JSON.stringify(widget)}); true`;
const SHOWN = (id: string): string => `document.getElementById(${JSON.stringify(id)}) !== null`;

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const page = await paged(origin, "body lock", { size: [800, 600] });

try {
	await waited(300);
	for (const [widget, id, what] of [
		["rename", "rename", "a dialog state"],
		["delete", "delete", "an alert dialog state"],
	] as const) {
		await page.ask(DRAW(widget));
		await waited(300);
		check(`${what} is drawn on the canvas`, (await page.ask(SHOWN(id))) === true, id);
		const open = await bodyLockFindingsOf(page);
		check(`${what} leaves the window's pointer, scroll, focus and readers alone`, leavesWindowAlone(open), open);
		await page.ask(`window.__CLEAR__(); true`);
		await waited(300);
		const after = await bodyLockFindingsOf(page);
		check(`and removing the drawing leaves it alone too`, leavesWindowAlone(after), after);
	}
	const boom = await page.ask(`document.getElementById("boom").textContent`);
	check("the page drew without a failure", boom === "", boom);
} finally {
	page.close();
	server.close();
}
console.log(failed === 0 ? "body lock: clean" : `body lock: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
