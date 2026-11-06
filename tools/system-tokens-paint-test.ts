import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { colorOf, type Rgba } from "../packages/shared/core/src/color-math.js";
import { findBrowser } from "./harness.ts";
import { THEMES, type HostTheme } from "./host-themes.ts";
import { BOARD_SHEET } from "./sheet-paths.mts";

const CHANNEL_TOLERANCE = 1 / 255;
const ALPHA_TOLERANCE = 0.002;
const SWEPT_HUE = 140;
const SETTLE_MS = 300;

const BaselineSchema = z.object({
	light: z.record(z.string(), z.string()),
	dark: z.record(z.string(), z.string()),
});

const baseline = BaselineSchema.parse(JSON.parse(readFileSync("tools/kit-tokens-obsidian.json", "utf8")));
const sheet = readFileSync(BOARD_SHEET, "utf8");
const chrome = findBrowser("system tokens");
const work = mkdtempSync(path.join(tmpdir(), "wg-system-tokens-"));
let failed = 0;

function check(name: string, isPassing: boolean, said: string): void {
	if (!isPassing) {
		failed += 1;
	}

	console.log(`${isPassing ? "OK  " : "!!  "}${name}${isPassing ? "" : `  ${said}`}`);
}

function pageOf(theme: HostTheme, rootClass: string): string {
	return `<!doctype html><html class="${rootClass}"><head><meta charset="utf-8"><style>${sheet}</style></head>
<body class="theme-${theme}" style="${THEMES[theme].replace(/\s+/g, " ")}"><div class="wg-root" id="root"></div></body></html>`;
}

function probeOf(names: readonly string[], hue: number | null): string {
	return `(async () => {
	if (${hue} !== null) document.documentElement.style.setProperty("--hue", "${hue}");
	await new Promise((done) => setTimeout(done, ${SETTLE_MS}));
	const root = document.getElementById("root");
	const probe = root.appendChild(document.createElement("div"));
	return Object.fromEntries(${JSON.stringify(names)}.map((name) => {
		probe.style.backgroundColor = "var(" + name + ")";
		return [name, getComputedStyle(probe).backgroundColor];
	}));
})()`;
}

async function evaluateIn(html: string, expression: string): Promise<Record<string, string>> {
	const file = path.join(work, `page-${Math.random().toString(36).slice(2)}.html`);
	writeFileSync(file, html);
	const port = 9800 + Math.floor(Math.random() * 400);
	const profile = mkdtempSync(path.join(tmpdir(), "wg-system-tokens-profile-"));
	const browser = spawn(
		chrome,
		[
			"--headless=new",
			"--disable-gpu",
			"--no-sandbox",
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${profile}`,
			`file://${file}`,
		],
		{ stdio: "ignore" },
	);
	try {
		return await evaluateOverDevtools(port, expression);
	} finally {
		browser.kill();
	}
}

async function evaluateOverDevtools(port: number, expression: string): Promise<Record<string, string>> {
	const socketUrl = await pageSocketOf(port);
	const socket = new WebSocket(socketUrl);
	await new Promise((done) => socket.addEventListener("open", done, { once: true }));
	const answer = new Promise<unknown>((done) =>
		socket.addEventListener("message", (event) => done(JSON.parse(String(event.data))), { once: true }),
	);
	socket.send(
		JSON.stringify({
			id: 1,
			method: "Runtime.evaluate",
			params: { expression, awaitPromise: true, returnByValue: true },
		}),
	);
	const parsed = z
		.object({ result: z.object({ result: z.object({ value: z.record(z.string(), z.string()) }) }) })
		.parse(await answer);
	socket.close();
	return parsed.result.result.value;
}

async function pageSocketOf(port: number): Promise<string> {
	const TargetsSchema = z.array(z.object({ type: z.string(), webSocketDebuggerUrl: z.string().optional() }));
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const targets = await fetch(`http://127.0.0.1:${port}/json/list`)
			.then(async (response) => TargetsSchema.parse(await response.json()))
			.catch(() => []);
		const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl !== undefined);
		if (page?.webSocketDebuggerUrl !== undefined) {
			return page.webSocketDebuggerUrl;
		}

		await new Promise((done) => setTimeout(done, 120));
	}

	throw new Error("chrome never opened a page target");
}

function isSameColour(got: string | undefined, want: string | undefined): boolean {
	const [gotColour, wantColour] = [colorOf(got), colorOf(want)];
	if (gotColour === null || wantColour === null) {
		return false;
	}

	const { channel, alpha } = distanceOf(gotColour, wantColour);
	return channel <= CHANNEL_TOLERANCE + 1e-6 && alpha <= ALPHA_TOLERANCE;
}

function distanceOf(got: Rgba, want: Rgba): { readonly channel: number; readonly alpha: number } {
	return {
		channel: Math.max(Math.abs(got.r - want.r), Math.abs(got.g - want.g), Math.abs(got.b - want.b)),
		alpha: Math.abs(got.a - want.a),
	};
}

function driftedTokens(drawn: Record<string, string>, wanted: Record<string, string>): string[] {
	return Object.entries(wanted)
		.filter(([name, want]) => !isSameColour(drawn[name], want))
		.map(([name, want]) => `${name}: drew ${drawn[name] ?? "nothing"}, want ${want}`);
}

for (const theme of ["light", "dark"] as const) {
	const wanted = baseline[theme];
	const drawn = await evaluateIn(pageOf(theme, ""), probeOf(Object.keys(wanted), null));
	const drifted = driftedTokens(drawn, wanted);
	check(
		`${theme}: every kit token draws what Obsidian drew before the flip, within 1/255`,
		drifted.length === 0,
		drifted.join("; "),
	);

	const swept = await evaluateIn(pageOf(theme, ""), probeOf(["--wg-kit-accent", "--wg-kit-text"], SWEPT_HUE));
	check(
		`${theme}: --hue on the root repaints the brand`,
		!isSameColour(swept["--wg-kit-accent"], drawn["--wg-kit-accent"]),
		`accent stayed ${String(swept["--wg-kit-accent"])}`,
	);
	check(
		`${theme}: --hue leaves an untinted ink alone`,
		isSameColour(swept["--wg-kit-text"], drawn["--wg-kit-text"]),
		`ink moved to ${String(swept["--wg-kit-text"])}`,
	);
}

const classDark = await evaluateIn(pageOf("light", "dark"), probeOf(["--wg-kit-page"], null));
check(
	".dark on the root selects the dark block as .theme-dark does",
	isSameColour(classDark["--wg-kit-page"], baseline.dark["--wg-kit-page"]),
	`page drew ${String(classDark["--wg-kit-page"])}, want ${String(baseline.dark["--wg-kit-page"])}`,
);

console.log(failed === 0 ? "\nsystem tokens: all passed" : `\nsystem tokens: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
