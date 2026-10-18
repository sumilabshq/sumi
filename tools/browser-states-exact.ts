import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import { differences } from "./studio-tabs-diff.ts";
import type { Difference } from "./studio-tabs-diff.ts";
import { BOARD_CARD, BUILT_CARD, GEIST_LOADED, MANY, PALETTE_PROBE, STATES_PROBE } from "./browser-states-probe.ts";
import type { StateParts } from "./browser-states-probe.ts";
import type { StateScene } from "./browser-states-page.tsx";

export interface ExactStatesReport {
	readonly differences: number;
	readonly unjudged: readonly string[];
	readonly deliberate: readonly string[];
	readonly found: Readonly<Record<string, readonly Difference[]>>;
	readonly measured: Readonly<Record<string, unknown>>;
}

type UnsizedScene = Omit<StateScene, "width" | "height">;
type FailedKind = "not-found" | "offline" | "timed-out" | "certificate" | "scheme";

interface BoardScene {
	readonly scene: UnsizedScene;
	readonly file: string;
	readonly root: string;
	readonly at: number;
}

type Palette = Readonly<Record<string, readonly number[]>>;

interface Built {
	readonly seen: Record<string, Record<string, unknown>>;
	readonly palette: Palette;
}

interface Root {
	readonly selector: string;
	readonly at: number;
}

const REPO = path.resolve(import.meta.dirname, "..");
const BOARDS = path.join(REPO, "docs/reference/browser-states");
const SHEETS = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"];
const GEIST_FACES = (
	readFileSync(path.join(REPO, "packages/host-obsidian/styles.css"), "utf8").match(
		/@font-face\s*\{[^}]*font-family:\s*"Geist"[^}]*\}/g,
	) ?? []
).join("\n");
const BOARD_SIZE: readonly [number, number] = [1600, 1000];
const BUILT_SIZE: readonly [number, number] = [1700, 1000];
const BUILT_AREA = "[data-browser-page-area]";
const BOARD_BRAND = `getComputedStyle(document.querySelector(".boardwrap")).getPropertyValue("--brand").trim()`;
const BOARD_PALETTE_DELTAS: Readonly<Record<string, Palette>> = {
	light: {
		edge: [226, 227, 230],
		faint: [154, 157, 165],
	},
	dark: {
		raise: [41, 42, 46],
		wash: [30, 42, 82],
		faint: [124, 127, 135],
	},
};
const PALETTE_TOLERANCE = 1;
const FIELD_BORDER_PX = 1;
export const UNJUDGED = [
	"brand: the accent is the host's; the board's is pinned on the outlet so everything drawn from it is compared",
	"palette deltas: where the board's hand-picked hex and the studio design system disagree (light edge and faint, dark raise, wash and faint), the built must wear the system token the board's colour stands for: raise, accent-wash, border, muted-foreground at 67%",
	"font family: the outlet draws in the host's interface font; the built page is set to Geist, the board's, so text-bearing sizes are comparable",
	"timed-out reason x and width: the board's second sentence is a design note, the built copy says only what happened, in two lines too",
	"favicon fill: the board paints made-up brand colours; a real chip shows the site's own favicon",
	"Ink's eye pose: it follows the pointer or the state's own gaze, so only Ink's box is judged",
];

export const DELIBERATE = [
	"new tab field border: the board's field has none; the person asked for a 1px resting border in the input token (--border), so the board is judged as if it wore one, its side padding 1px less so everything inside stands where the board puts it",
];

export async function exactStatesReport(): Promise<ExactStatesReport> {
	const found: Record<string, readonly Difference[]> = {};
	const measured: Record<string, unknown> = {};

	for (const theme of ["light", "dark"] as const) {
		const boards = await boardsOf(theme);
		const shown = SCENES.filter(({ scene }) => boards[scene.id] !== undefined);
		const { seen, palette } = await builtOf(theme, boards, shown);
		const deltas = BOARD_PALETTE_DELTAS[theme] ?? {};

		for (const { scene } of shown) {
			const at = `${theme}.${scene.id}`;
			const board = withDeliberate(
				withSystemPalette(withoutUnjudged(scene.id, boards[scene.id]), deltas, palette),
				palette,
			);
			found[at] = differences(board, withoutUnjudged(scene.id, seen[scene.id]), at);
			measured[at] = {
				board: boards[scene.id],
				built: seen[scene.id],
				palette,
			};
		}
	}

	return {
		differences: Object.values(found).reduce((total, one) => total + one.length, 0),
		unjudged: UNJUDGED,
		deliberate: DELIBERATE,
		found,
		measured,
	};
}

const RECENT_ON_BOARD = ["acme.atlassian.net", "vite.dev", "github.com", "dashboard.stripe.com"].map((host) => ({
	host,
	address: `https://${host}/`,
	favicon: null,
}));

const SCENES: readonly BoardScene[] = [
	{
		file: "BrowserEmpty",
		root: ".hbody",
		at: 0,
		scene: sceneOf("empty", { url: "" }, RECENT_ON_BOARD),
	},
	{
		file: "BrowserNotFound",
		root: ".hbody",
		at: 0,
		scene: failed("not-found", "https://test.co/", "ERR_NAME_NOT_RESOLVED"),
	},
	{
		file: "BrowserStates",
		root: ".cell .hbody",
		at: 0,
		scene: failed("offline", "https://docs.acme.dev/guide", "ERR_INTERNET_DISCONNECTED"),
	},
	{
		file: "BrowserStates",
		root: ".cell .hbody",
		at: 1,
		scene: failed("timed-out", "https://api.acme.dev/status", "ERR_CONNECTION_TIMED_OUT"),
	},
	{
		file: "BrowserStates",
		root: ".cell .hbody",
		at: 2,
		scene: failed("certificate", "https://shop-acme.com/", "ERR_CERT_AUTHORITY_INVALID"),
	},
	{
		file: "BrowserStates",
		root: ".cell .hbody",
		at: 3,
		scene: {
			...sceneOf("blocked", { url: "https://bank.com/accounts" }, []),
			blockedSite: "bank.com",
		},
	},
	{
		file: "BrowserStates",
		root: ".cell .hbody",
		at: 4,
		scene: failed("scheme", "javascript:open()", ""),
	},
];

function sceneOf(id: string, tab: StateScene["tab"], recentSites: StateScene["recentSites"]): UnsizedScene {
	return {
		id,
		tab: {
			title: "",
			isLoading: false,
			canGoBack: false,
			canGoForward: false,
			failure: null,
			...tab,
		},
		recentSites,
		blockedSite: null,
	};
}

function failed(kind: FailedKind, address: string, code: string): UnsizedScene {
	return sceneOf(
		kind,
		{
			url: address,
			failure: {
				kind,
				address,
				code,
			},
		},
		[],
	);
}

function boardFileOf(file: string, theme: string): string | null {
	const themed = path.join(BOARDS, `${file}${theme === "dark" ? "Dark" : ""}.dc.html`);
	return existsSync(themed) ? themed : null;
}

async function boardsOf(theme: string): Promise<Record<string, Record<string, unknown>>> {
	const seen: Record<string, Record<string, unknown>> = {};

	for (const file of new Set(SCENES.map((one) => one.file))) {
		const at = boardFileOf(file, theme);

		if (at === null) {
			continue;
		}

		const page = await paged(at, "exact browser states board", { size: BOARD_SIZE });

		try {
			await waited(2000);
			await page.ask(`${GEIST_LOADED}(${JSON.stringify(GEIST_FACES)})`);
			const brand = await page.ask(BOARD_BRAND);

			for (const one of SCENES.filter((scene) => scene.file === file)) {
				seen[one.scene.id] = {
					...(await probe(page, { selector: one.root, at: one.at }, BOARD_CARD)),
					brand,
				};
			}
		} finally {
			page.close();
		}
	}

	return seen;
}

async function probe(page: AskedPage, root: Root, parts: StateParts): Promise<Record<string, unknown>> {
	const asked = await page.ask(
		`${STATES_PROBE}(${JSON.stringify(root)}, ${JSON.stringify(parts)}, ${JSON.stringify([...MANY])})`,
	);
	return isRecord(asked) ? { ...asked } : {};
}

function builtPageOf(theme: string, brand: unknown, scenes: readonly StateScene[]): string {
	const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const pinned = `.wg-studio, .wg-studio-outlet { --brand: ${String(brand)} !important; --font-interface: Geist, system-ui, sans-serif !important; }`;
	return `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style><style>${pinned}</style></head><body class="theme-${theme}"><div id="root"></div><pre id="boom"></pre><script>localStorage.clear(); window.__SCENES__ = ${JSON.stringify(scenes)};</script><script>__BUNDLE__</script></body></html>`;
}

async function builtOf(
	theme: string,
	boards: Record<string, Record<string, unknown>>,
	shown: readonly BoardScene[],
): Promise<Built> {
	const scenes = shown.map(({ scene }) => sizedScene(scene, boards[scene.id]));
	const brand = boards[scenes[0]?.id ?? ""]?.["brand"];
	const html = builtPageOf(theme, brand, scenes).replace("__BUNDLE__", () => bundled);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/`, "exact browser states build", { size: BUILT_SIZE });

	try {
		await waited(2000);
		await page.ask(`${GEIST_LOADED}("")`);
		await page.reduceMotion();
		await waited(300);
		const seen: Record<string, Record<string, unknown>> = {};

		for (const [at, scene] of scenes.entries()) {
			seen[scene.id] = await probe(page, { selector: BUILT_AREA, at }, BUILT_CARD);
		}

		const palette = await page.ask(PALETTE_PROBE);
		return {
			seen,
			palette: isRecord(palette) ? paletteOf(palette) : {},
		};
	} finally {
		page.close();
		server.close();
	}
}

function sizedScene(scene: UnsizedScene, board: Record<string, unknown> | undefined): StateScene {
	const area = isRecord(board?.["area"]) ? board["area"] : {};
	return {
		...scene,
		width: Number(area["w"] ?? 0),
		height: Number(area["h"] ?? 0),
	};
}

function withoutUnjudged(id: string, seen: Record<string, unknown> | undefined): Record<string, unknown> {
	const reason = isRecord(seen?.["reason"]) ? seen["reason"] : null;
	const isNoted = id === "timed-out" && reason !== null;
	return {
		...seen,
		brand: null,
		reason: isNoted
			? {
					...reason,
					x: null,
					w: null,
				}
			: reason,
	};
}

const bundled = await bundleOf("tools/browser-states-page.tsx");

function paletteOf(read: Readonly<Record<string, unknown>>): Palette {
	return Object.fromEntries(
		Object.entries(read).flatMap(([name, value]) => (Array.isArray(value) ? [[name, value.map(Number)]] : [])),
	);
}

function withSystemPalette(seen: unknown, deltas: Palette, palette: Palette): unknown {
	if (isColour(seen)) {
		const name = Object.keys(deltas).find((one) => isNear(seen, deltas[one] ?? []));
		return name === undefined ? seen : (palette[name] ?? seen);
	}

	if (Array.isArray(seen)) {
		return seen.map((one: unknown) => withSystemPalette(one, deltas, palette));
	}

	if (isRecord(seen)) {
		return Object.fromEntries(Object.entries(seen).map(([key, one]) => [key, withSystemPalette(one, deltas, palette)]));
	}

	return seen;
}

function withDeliberate(board: unknown, palette: Palette): unknown {
	if (!isRecord(board) || !isRecord(board["field"])) {
		return board;
	}

	const padding = Array.isArray(board["field"]["padding"]) ? board["field"]["padding"].map(Number) : [];
	const [top, right, bottom, left] = padding;

	return {
		...board,
		field: {
			...board["field"],
			padding: [top, Number(right) - FIELD_BORDER_PX, bottom, Number(left) - FIELD_BORDER_PX],
			border: {
				width: FIELD_BORDER_PX,
				colour: palette["edge"] ?? null,
			},
		},
	};
}

function isColour(value: unknown): value is readonly number[] {
	return Array.isArray(value) && value.length === 3 && value.every((one) => typeof one === "number");
}

function isNear(colour: readonly number[], other: readonly number[]): boolean {
	return colour.every((value, at) => Math.abs(value - (other[at] ?? Number.POSITIVE_INFINITY)) <= PALETTE_TOLERANCE);
}
