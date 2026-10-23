import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import {
	CARD_PARTS,
	EMPTY_PARTS,
	FIELD_PARTS,
	HOVER_ROW_PARTS,
	IDLE_PARTS,
	MENU_PARTS,
	PART_PROBE,
	REMOVE_LAST_PARTS,
	REMOVE_PARTS,
	TIP_PARTS,
	TYPED_PARTS,
	USAGE_PARTS,
} from "./chat-composer-probe.ts";
import type { Parts } from "./chat-composer-probe.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import { differences } from "./studio-tabs-diff.ts";
import type { Difference } from "./studio-tabs-diff.ts";

type Theme = "light" | "dark";

interface Phase {
	readonly name: string;
	readonly board: string;
	readonly boardScope: Readonly<Record<Theme, string>>;
	readonly menuLabel?: string;
	readonly state: string;
	readonly act: (page: AskedPage) => Promise<void>;
	readonly parts: Parts;
}

const REPO = path.resolve(import.meta.dirname, "..");
const BOARDS = path.join(REPO, "docs/reference/chat-composer");
const THEMES: readonly Theme[] = ["light", "dark"];
const SHEETS = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"];
const GEIST_FACES = (
	readFileSync(path.join(REPO, "packages/host-obsidian/styles.css"), "utf8").match(
		/@font-face\s*\{[^}]*font-family:\s*"Geist"[^}]*\}/g,
	) ?? []
).join("\n");
const GEIST_LOADED = `(async (faces) => { if (faces !== "") { const sheet = document.createElement("style"); sheet.textContent = faces; document.head.append(sheet); } await Promise.all(["400 13px Geist", "500 13px Geist", "600 16px Geist", "400 15px Geist", "500 28px Geist"].map((face) => document.fonts.load(face))); await document.fonts.ready; return document.fonts.check("500 13px Geist"); })`;
const SETTLE_MS = 400;
const TYPED = "Add a weekly view to the habits page";
const TYPE_IN = `((said) => { const box = document.querySelector(".wg-studio-ai-box"); box.focus(); const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; setter.call(box, said); box.dispatchEvent(new Event("input", { bubbles: true })); return true; })`;
const PRESS = `((selector, text) => { const found = [...document.querySelectorAll(selector)].find((el) => text === "" || el.getAttribute("aria-label") === text); found.click(); return true; })`;
const CENTRE = `((selector) => { const found = [...document.querySelectorAll(selector)].find((el) => el.getClientRects().length > 0); const box = found.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;

const noAct = async (): Promise<void> => undefined;

async function typedIn(page: AskedPage): Promise<void> {
	await page.ask(`${TYPE_IN}(${JSON.stringify(TYPED)})`);
	await waited(SETTLE_MS);
}

async function hoveredOn(page: AskedPage, selector: string): Promise<void> {
	const centre = await page.ask(`${CENTRE}(${JSON.stringify(selector)})`);

	if (!Array.isArray(centre)) {
		throw new Error(`nothing to hover at ${selector}`);
	}

	await page.hover(Number(centre[0]), Number(centre[1]));
	await waited(SETTLE_MS * 2);
}

async function pressed(page: AskedPage, selector: string, label: string): Promise<void> {
	await page.ask(`${PRESS}(${JSON.stringify(selector)}, ${JSON.stringify(label)})`);
	await waited(SETTLE_MS);
}

const SLICE_LIGHT = ".slice.tok:not(.dark)";
const SLICE_DARK = ".slice.tok.dark";

const PHASES: readonly Phase[] = [
	{
		name: "idle",
		board: "ComposerMono",
		boardScope: { light: SLICE_LIGHT, dark: SLICE_DARK },
		state: "composer",
		act: noAct,
		parts: IDLE_PARTS,
	},
	{
		name: "typed",
		board: "ComposerMono",
		boardScope: {
			light: `${SLICE_LIGHT}:has(.send.ready):has(.strip)`,
			dark: `${SLICE_DARK}:has(.send.ready):has(.strip)`,
		},
		state: "composer",
		act: typedIn,
		parts: {
			...FIELD_PARTS,
			...TYPED_PARTS,
		},
	},
	{
		name: "tooltip",
		board: "ComposerMono",
		boardScope: {
			light: `${SLICE_LIGHT}:has(.send .tip)`,
			dark: `${SLICE_DARK}:has(.send .tip)`,
		},
		state: "composer",
		act: async (page) => {
			await typedIn(page);
			await hoveredOn(page, ".wg-studio-ai-send");
		},
		parts: TIP_PARTS,
	},
	{
		name: "cards",
		board: "ComposerMonoFolder",
		boardScope: {
			light: `${SLICE_LIGHT}:has(.afolder:not(.hovring))`,
			dark: `${SLICE_DARK}:has(.afolder:not(.hovring))`,
		},
		state: "attach",
		act: noAct,
		parts: CARD_PARTS,
	},
	{
		name: "remove",
		board: "ComposerMonoFolder",
		boardScope: {
			light: `${SLICE_LIGHT}:has(.afolder.hovring)`,
			dark: `${SLICE_DARK}:has(.afolder.hovring)`,
		},
		state: "attach",
		act: async (page) => hoveredOn(page, "[data-attachment-card=folder]"),
		parts: REMOVE_PARTS,
	},
	{
		name: "remove last",
		board: "ComposerMonoFolder",
		boardScope: {
			light: `${SLICE_LIGHT}:has(.afile:not(.afolder).hovring)`,
			dark: `${SLICE_DARK}:has(.afile:not(.afolder).hovring)`,
		},
		state: "attach",
		act: async (page) => hoveredOn(page, "[data-attachment-card=text]"),
		parts: REMOVE_LAST_PARTS,
	},
	{
		name: "model menu",
		board: "ComposerMonoStrip",
		boardScope: { light: "nth:1:.slice", dark: "nth:1:.slice" },
		menuLabel: "Provider",
		state: "composer",
		act: async (page) => {
			await pressed(page, ".wg-studio-ai-strip-button", "Model");
			await hoveredOn(page, ".wg-studio-ai-menu-row:not(.is-picked)");
		},
		parts: {
			...MENU_PARTS,
			...HOVER_ROW_PARTS,
		},
	},
	{
		name: "usage menu",
		board: "ComposerMonoStrip",
		boardScope: { light: "", dark: "" },
		menuLabel: "Usage",
		state: "composer",
		act: async (page) => pressed(page, ".wg-studio-ai-strip-button", "Usage"),
		parts: USAGE_PARTS,
	},
	{
		name: "empty",
		board: "ChatEmptyBottom",
		boardScope: { light: ".pane.tok:not(.dark)", dark: ".pane.tok.dark" },
		state: "empty",
		act: noAct,
		parts: EMPTY_PARTS,
	},
];

export interface ComposerDiffReport {
	readonly differences: readonly Difference[];
	readonly measured: Readonly<Record<string, unknown>>;
}

function boardFileOf(phase: Phase, theme: Theme): string {
	const dark = phase.board === "ComposerMonoStrip" && theme === "dark" ? "ComposerMonoStripDark" : phase.board;
	return path.join(BOARDS, `${dark}.dc.html`);
}

function asked(phase: Phase, theme: Theme, side: "board" | "built"): string {
	const scope = side === "board" ? phase.boardScope[theme] : "";
	const label = phase.menuLabel === undefined ? "undefined" : JSON.stringify(phase.menuLabel);
	return `(() => { window.__MENU_LABEL__ = ${label}; return ${PART_PROBE}(${JSON.stringify(scope)}, ${JSON.stringify(phase.parts)}, ${JSON.stringify(side)}); })()`;
}

async function boardOf(phase: Phase, theme: Theme): Promise<Record<string, unknown>> {
	const page = await paged(boardFileOf(phase, theme), "chat composer board", { size: [1600, 1500] });

	try {
		await waited(2500);
		await page.ask(`${GEIST_LOADED}(${JSON.stringify(GEIST_FACES)})`);
		const seen = await page.ask(asked(phase, theme, "board"));
		return isRecord(seen) ? seen : {};
	} finally {
		page.close();
	}
}

function builtPageOf(theme: Theme): string {
	const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const placed = `.wg-studio.wg-studio { display: block; height: auto; padding: 0; } .wg-studio .wg-studio-chat { width: 752px; height: 820px; padding: 0; } #chat, #chat > .wg-root { height: 100%; }`;
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style><style>${placed}</style></head><body class="theme-${theme}"><div class="wg-root wg-portal wg-kit-portal-layer is-studio"></div><div class="wg-studio"><aside class="wg-studio-chat"><div id="chat"></div></aside></div><script>__BUNDLE__</script></body></html>`;
}

async function builtOf(phase: Phase, theme: Theme, bundled: string): Promise<Record<string, unknown>> {
	const html = builtPageOf(theme).replace("__BUNDLE__", () => bundled);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/#${phase.state}`, "chat composer build", { size: [1200, 1000] });

	try {
		await waited(2000);
		await page.ask(`${GEIST_LOADED}("")`);
		await page.reduceMotion();
		await phase.act(page);
		const seen = await page.ask(asked(phase, theme, "built"));
		return isRecord(seen) ? seen : {};
	} finally {
		page.close();
		server.close();
	}
}

export async function composerDiffReport(): Promise<ComposerDiffReport> {
	const bundled = await bundleOf("tools/chat-composer-page.tsx");
	const found: Difference[] = [];
	const measured: Record<string, unknown> = {};

	for (const phase of PHASES) {
		for (const theme of THEMES) {
			const board = await boardOf(phase, theme);
			const built = await builtOf(phase, theme, bundled);
			const at = `${phase.name}/${theme}`;
			measured[at] = {
				board,
				built,
			};
			found.push(...differences(board, built, at));
		}
	}

	return {
		differences: found,
		measured,
	};
}

const isRunAlone = process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1]);

if (isRunAlone) {
	const report = await composerDiffReport();
	const shown = process.argv.includes("--measured") ? report.measured : null;

	if (shown !== null) {
		console.log(JSON.stringify(shown, null, 1));
	}

	for (const difference of report.differences) {
		console.log(
			`DIFF ${difference.at}: board ${JSON.stringify(difference.board)} built ${JSON.stringify(difference.built)}`,
		);
	}

	console.log(`${report.differences.length} difference(s) between the boards and the build`);
	process.exit(report.differences.length === 0 ? 0 : 1);
}
