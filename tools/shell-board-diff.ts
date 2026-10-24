import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waitUntil, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

type Theme = "light" | "dark";
type Board = "Fx-inter-chat" | "Gt-narrow";

interface Pair {
	readonly name: string;
	readonly board: Board;
	readonly boardAt: string;
	readonly buildAt: string;
	readonly props: readonly string[];
}

const PLATE = ["borderTopLeftRadius", "backgroundColor", "boxShadow", "borderTopWidth"];
const ROW = ["height", "paddingLeft", "paddingRight", "columnGap"];
const BUTTON = ["width", "height", "borderTopLeftRadius", "color", "backgroundColor"];
const ICON = ["width", "height", "strokeWidth"];
const CRUMB = [
	"height",
	"paddingLeft",
	"paddingRight",
	"columnGap",
	"fontSize",
	"lineHeight",
	"color",
	"borderTopLeftRadius",
];

const PAIRS: readonly Pair[] = [
	{
		name: "frame",
		board: "Fx-inter-chat",
		boardAt: "div.sm",
		buildAt: ".wg-shell",
		props: ["paddingTop", "paddingLeft", "backgroundColor", "fontSize", "letterSpacing", "fontFeatureSettings"],
	},
	{ name: "chats column", board: "Fx-inter-chat", boardAt: "nav.lc", buildAt: ".wg-shell-left", props: ["width"] },
	{ name: "tabs column", board: "Fx-inter-chat", boardAt: "aside.tabs", buildAt: ".wg-shell-right", props: ["width"] },
	{
		name: "chat plate",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate",
		buildAt: ".wg-shell-plate.is-chat",
		props: PLATE,
	},
	{
		name: "chat header",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header",
		buildAt: ".wg-plate-head.is-chat .wg-plate-head-row",
		props: ROW,
	},
	{
		name: "chats toggle",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header > button.x-ib",
		buildAt: '.wg-plate-head.is-chat button[aria-label="Hide chats"]',
		props: BUTTON,
	},
	{
		name: "chats toggle icon",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header > button.x-ib > svg",
		buildAt: '.wg-plate-head.is-chat button[aria-label="Hide chats"] svg',
		props: ICON,
	},
	{
		name: "chat crumb",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header > .x-crumb",
		buildAt: ".wg-plate-head.is-chat .wg-ws-crumb",
		props: [...CRUMB, "fontFamily"],
	},
	{
		name: "crumb first",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header > .x-crumb > span:nth-child(1)",
		buildAt: ".wg-plate-head.is-chat .wg-ws-crumb-workspace",
		props: ["color", "fontWeight"],
	},
	{
		name: "crumb slash",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header > .x-crumb > span:nth-child(2)",
		buildAt: ".wg-plate-head.is-chat .wg-ws-crumb-slash",
		props: ["color"],
	},
	{
		name: "crumb second",
		board: "Fx-inter-chat",
		boardAt: "main.x-plate > header > .x-crumb > span:nth-child(3)",
		buildAt: ".wg-plate-head.is-chat .wg-ws-crumb-chat",
		props: ["color", "fontWeight"],
	},
	{
		name: "app plate",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"]',
		buildAt: ".wg-shell-plate.is-app",
		props: PLATE,
	},
	{
		name: "app header",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"] > header',
		buildAt: ".wg-plate-head.is-app .wg-plate-head-row",
		props: ROW,
	},
	{
		name: "forward (off)",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"] > header > button[aria-label="Forward"]',
		buildAt: '.wg-plate-head.is-app button[aria-label="Forward"]',
		props: BUTTON,
	},
	{
		name: "app crumb",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"] > header > .x-crumb',
		buildAt: ".wg-plate-head.is-app .wg-plate-crumb",
		props: [...CRUMB, "marginLeft"],
	},
	{
		name: "more",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"] > header > button[aria-label="More"]',
		buildAt: '.wg-plate-head.is-app button[aria-label="More"]',
		props: BUTTON,
	},
	{
		name: "tabs toggle",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"] > header > button[aria-label="Hide tabs"]',
		buildAt: '.wg-plate-head.is-app button[aria-label="Hide tabs"]',
		props: BUTTON,
	},
	{
		name: "tabs toggle icon",
		board: "Gt-narrow",
		boardAt: 'main[aria-label="Changes"] > header > button[aria-label="Hide tabs"] > svg',
		buildAt: '.wg-plate-head.is-app button[aria-label="Hide tabs"] svg',
		props: ICON,
	},
];

const VIEW: readonly [number, number] = [1440, 900];
const outAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-shell-board-diff"));
mkdirSync(outAt, { recursive: true });

const READ = `((pairs) => pairs.map(({ at, props }) => {
	const element = document.querySelector(at);
	if (!element) return null;
	const look = getComputedStyle(element);
	const plate = element.classList.contains("wg-kit-icon") ? getComputedStyle(element, "::before") : look;
	const paintedOnPlate = ["borderTopLeftRadius", "backgroundColor"];
	const box = element.getBoundingClientRect();
	return Object.fromEntries(props.map((prop) => [prop, prop === "width" ? Math.round(box.width) + "px" : prop === "height" ? Math.round(box.height) + "px" : paintedOnPlate.includes(prop) ? plate[prop] : look[prop]]));
}))`;

async function readOf(page: AskedPage, asked: readonly { at: string; props: readonly string[] }[]): Promise<unknown[]> {
	return (await page.ask(`(${READ})(${JSON.stringify(asked)})`)) as unknown[];
}

async function boardReads(board: Board, theme: Theme): Promise<unknown[]> {
	const page = await paged(path.resolve(`docs/reference/sumi-layout/${board}.dc.html`), "board", {
		size: [1728, 1080],
	});
	try {
		await waitUntil(async () => (await page.ask(`document.querySelector("div.sm") !== null`)) === true, 10_000, 100);
		if (theme === "dark") await page.ask(`document.querySelector("div.sm").classList.add("dark"); true`);
		const pairs = PAIRS.filter((pair) => pair.board === board);
		return await readOf(
			page,
			pairs.map((pair) => ({ at: pair.boardAt, props: pair.props })),
		);
	} finally {
		page.close();
	}
}

async function buildReads(theme: Theme): Promise<unknown[]> {
	const bundle = await bundleOf("tools/shell-frame-page.tsx");
	const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"]
		.map((at) => readFileSync(at, "utf8"))
		.join("\n");
	const file = path.join(outAt, `build-${theme}.html`);
	writeFileSync(
		file,
		`<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>${sheets}</style><style>html,body,#root{height:100%;margin:0}</style></head><body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();</script><script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`,
	);
	const page = await paged(file, "build", { size: VIEW });
	try {
		await waited(1500);
		return await readOf(
			page,
			PAIRS.map((pair) => ({ at: pair.buildAt, props: pair.props })),
		);
	} finally {
		page.close();
	}
}

let differences = 0;
for (const theme of ["light", "dark"] as const) {
	const build = await buildReads(theme);
	const boards: Record<Board, unknown[]> = {
		"Fx-inter-chat": await boardReads("Fx-inter-chat", theme),
		"Gt-narrow": await boardReads("Gt-narrow", theme),
	};
	const boardAt: Record<Board, number> = { "Fx-inter-chat": 0, "Gt-narrow": 0 };
	for (const [at, pair] of PAIRS.entries()) {
		const fromBoard = boards[pair.board][boardAt[pair.board]++] as Record<string, string> | null;
		const fromBuild = build[at] as Record<string, string> | null;
		if (fromBoard === null || fromBuild === null) {
			differences += 1;
			console.log(
				`${theme} ${pair.name}: missing (board ${String(fromBoard !== null)}, build ${String(fromBuild !== null)})`,
			);
			continue;
		}

		for (const prop of pair.props) {
			if (fromBoard[prop] === fromBuild[prop]) continue;
			differences += 1;
			console.log(`${theme} ${pair.name} ${prop}: board ${fromBoard[prop]} | build ${fromBuild[prop]}`);
		}
	}
}

console.log(`${differences} difference(s)`);
