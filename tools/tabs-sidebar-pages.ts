import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { canvasSheet } from "./canvas-sheet.mts";
import { bundleOf } from "./harness.ts";
import type { Theme } from "./harness.ts";

export const SIDEBAR_GATE = "test:studio-tabs";
export const BOARD_SIZE: readonly [number, number] = [420, 1000];

const INTER = path.resolve("packages/shared/kit/assets/fonts/inter/InterVariable-latin.woff2");
const FONT_FACES = ["Inter Variable", "Inter"]
	.map(
		(family) =>
			`@font-face { font-family: "${family}"; font-style: normal; font-weight: 100 900; src: url("file://${INTER}") format("woff2"); }`,
	)
	.join("\n");
const ROW_RENDERS_HOOK = `<script>
window.__ROWS__ = { renders: 0, tiles: 0, last: new Set() };
window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
	supportsFiber: true,
	renderers: new Map(),
	inject() { return 1; },
	onScheduleFiberRoot() {},
	onCommitFiberUnmount() {},
	onPostCommitFiberRoot() {},
	onCommitFiberRoot(id, root) {
		const seen = new Set();
		const walk = (fiber) => {
			for (let at = fiber; at !== null; at = at.sibling) {
				const name = typeof at.type === "function" ? at.type.name : "";
				const kind = /^TabRow\\d*$/.test(name) ? "renders" : /^EssentialTile\\d*$/.test(name) ? "tiles" : null;
				if (kind !== null) {
					seen.add(at.memoizedProps);
					if (!window.__ROWS__.last.has(at.memoizedProps)) window.__ROWS__[kind] += 1;
				}
				if (at.child !== null) walk(at.child);
			}
		};
		walk(root.current);
		window.__ROWS__.last = seen;
	},
};
window.__arm = () => {
	const started = { at: null, firstPaint: null, commits: window.__SIDEBAR__.counted.commits, rows: window.__ROWS__.renders, tiles: window.__ROWS__.tiles, frames: [] };
	const stamp = (event) => { if (started.at === null) started.at = event.timeStamp; };
	for (const kind of ["pointerdown", "mousedown", "contextmenu", "keydown"]) window.addEventListener(kind, stamp, { capture: true, once: true });
	const observer = new MutationObserver(() => {
		if (started.at === null) return;
		observer.disconnect();
		requestAnimationFrame(() => { started.firstPaint = performance.now(); });
	});
	observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
	let last = performance.now();
	const tick = (now) => { started.frames.push(now - last); last = now; if (started.frames.length < 400) requestAnimationFrame(tick); };
	requestAnimationFrame(tick);
	window.__armed = started;
	return true;
};
window.__result = () => {
	const started = window.__armed;
	return { ms: started.at === null || started.firstPaint === null ? null : Math.round((started.firstPaint - started.at) * 10) / 10, commits: window.__SIDEBAR__.counted.commits - started.commits, rows: window.__ROWS__.renders - started.rows, tiles: window.__ROWS__.tiles - started.tiles, worstFrame: Math.round(Math.max(0, ...started.frames.slice(1)) * 10) / 10 };
};
</script>`;

export const THEMED = `((theme) => { document.documentElement.classList.toggle("dark", theme === "dark"); document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme !== "dark"); return true; })`;

export async function sidebarPageFile(folder: string): Promise<string> {
	mkdirSync(folder, { recursive: true });
	const [bundle, sheet] = await Promise.all([bundleOf("tools/tabs-sidebar-page.tsx"), canvasSheet(process.cwd())]);
	const sumi = readFileSync("design-systems/sumi/sumi.css", "utf8");
	const kit = readFileSync("apps/host-obsidian/styles.css", "utf8");
	const file = path.join(folder, "tabs-sidebar.html");
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACES}\n${kit}\n${sumi}\n${sheet}\nbody{margin:0;font-family:var(--sumi-font-ui)}</style>${ROW_RENDERS_HOOK}</head>
<body class="theme-light"><div id="root"></div><pre id="boom"></pre>
<script>localStorage.clear();</script>
<script>${bundle}</script></body></html>`,
	);
	return file;
}

export function boardPageFile(folder: string, board: string, theme: Theme): string {
	const html = readFileSync(path.join("docs/reference/sumi-layout", `${board}.dc.html`), "utf8");
	const style = html.split("<style>")[1]?.split("</style>")[0] ?? "";
	const body = (html.split("</helmet>")[1]?.split("</x-dc>")[0] ?? "").replaceAll(
		"{{themeCls}}",
		theme === "dark" ? "dark" : "",
	);
	const file = path.join(folder, `${board}-${theme}.html`);
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACES}\n${style}</style></head><body>${body}</body></html>`,
	);
	return file;
}

export async function openedPage(file: string, size: readonly [number, number] = BOARD_SIZE): Promise<AskedPage> {
	const page = await paged(file, SIDEBAR_GATE, { size });
	await waited(400);
	return page;
}

export async function shotsOf(
	page: AskedPage,
	folder: string,
	name: string,
	themes: readonly Theme[],
): Promise<readonly string[]> {
	const written: string[] = [];

	for (const theme of themes) {
		await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
		await waited(150);
		const at = path.join(folder, `${name}-${theme}.png`);
		writeFileSync(at, await page.shoot());
		written.push(at);
	}

	await page.ask(`${THEMED}("light")`);
	return written;
}
