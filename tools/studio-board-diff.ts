import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import type { Theme } from "./harness.ts";
import { LOOKS_OF, LOOK_PROPS, isSameLook } from "./studio-board-measure.ts";
import type { Look } from "./studio-board-measure.ts";
import { ALIGNMENTS, CHATS_CONTENT_AXIS, CHAT_HEADER_CENTRE, SCENES } from "./studio-board-scenes.ts";
import type { Alignment, Scene } from "./studio-board-scenes.ts";
import { shippedTauriSheet, tauriFrontendSheet } from "./tauri-frontend-sheet.mts";

const VIEW: readonly [number, number] = [1440, 900];
const BOARDS = "docs/reference/sumi-layout";
const BOARD_FONT = `@font-face { font-family: "Inter"; src: url(/inter.woff2) format("woff2"); font-weight: 100 900; }`;
const REST_POINT = 720;
const TAURI_CONFIG = "apps/host-tauri/src-tauri/tauri.conf.json";
const LIGHT_TOP_UNDER_INSET_PX = 9;
const LIGHT_PX = 14;
const THEMES: readonly Theme[] = ["light", "dark"];
const WAIVED_MARK = "accepted · ";
const PLACE: readonly string[] = ["left", "top"];

const asked = process.argv.slice(2);
const isShipped = asked.includes("--shipped");
const probe = asked.find((one) => one.startsWith("--probe="))?.slice("--probe=".length) ?? null;
const onlyScene = asked.find((one) => one.startsWith("--scene="))?.slice("--scene=".length) ?? null;
const shotsAt = path.resolve(asked.find((one) => !one.startsWith("--")) ?? path.join(tmpdir(), "wg-studio-board-diff"));
mkdirSync(shotsAt, { recursive: true });

const [sheet, bundle] = await Promise.all([
	isShipped ? shippedTauriSheet() : tauriFrontendSheet(),
	bundleOf("tools/studio-board-page.tsx"),
]);
const font = readFileSync("packages/shared/kit/assets/fonts/inter/InterVariable-latin.woff2");
const BUILT = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${sheet}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();</script><script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;

const server = http.createServer((request, response) => {
	const url = new URL(request.url ?? "/", "http://here");
	if (url.pathname === "/inter.woff2") {
		response.setHeader("content-type", "font/woff2");
		response.end(font);
		return;
	}

	response.setHeader("content-type", "text/html");
	const board = url.searchParams.get("board");
	if (board === null) {
		response.end(BUILT);
		return;
	}

	response.end(boardPage(board, url.searchParams.get("theme") === "dark" ? "dark" : "light"));
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

function boardPage(board: string, theme: Theme): string {
	const text = readFileSync(path.join(BOARDS, `${path.basename(board)}.dc.html`), "utf8");
	const style = text.split("<style>")[1]?.split("</style>")[0] ?? "";
	const body = (text.split("</helmet>")[1]?.split("</x-dc>")[0] ?? "").replaceAll(
		"{{themeCls}}",
		theme === "dark" ? "dark" : "",
	);
	return `<!doctype html><html><head><meta charset="utf-8"><style>${BOARD_FONT}\n${style}</style></head><body>${body}</body></html>`;
}

function looksIn(held: unknown): Readonly<Record<string, Look | null>> {
	return typeof held === "object" && held !== null ? (held as Record<string, Look | null>) : {};
}

async function themed(page: AskedPage, theme: Theme): Promise<void> {
	await page.ask(`document.documentElement.classList.toggle("dark", ${JSON.stringify(theme === "dark")}); true`);
	await waited(200);
}

async function sceneDifferences(built: AskedPage, scene: Scene, theme: Theme): Promise<string[]> {
	const board = await paged(`${origin}?board=${scene.board}&theme=${theme}`, "studio board diff", {
		size: scene.boardSize ?? VIEW,
	});
	try {
		await waited(500);
		await scene.enter(built);
		const boardSide = Object.fromEntries(scene.pairs.map((pair) => [pair.name, pair.board]));
		const builtSide = Object.fromEntries(scene.pairs.map((pair) => [pair.name, pair.built]));
		const boardLooks = looksIn(await board.ask(`${LOOKS_OF}(${JSON.stringify(boardSide)})`));
		const builtLooks = looksIn(await built.ask(`${LOOKS_OF}(${JSON.stringify(builtSide)})`));
		writeFileSync(path.join(shotsAt, `${scene.name}-${theme}.png`), await built.shoot());
		await scene.leave(built);
		return scene.pairs.flatMap((pair) => {
			const fromBoard = boardLooks[pair.name] ?? null;
			const fromBuilt = builtLooks[pair.name] ?? null;
			if (fromBoard === null || fromBuilt === null) {
				return [`${pair.name}: ${fromBoard === null ? "not on the board" : "not built"}`];
			}

			const props = LOOK_PROPS.filter(
				(prop) =>
					(pair.only ?? LOOK_PROPS).includes(prop) &&
					!(pair.skip ?? []).includes(prop) &&
					(pair.isPlaced === true || !PLACE.includes(prop)),
			);
			return props.flatMap((prop) => {
				const wanted = fromBoard[prop] ?? "";
				const drawn = fromBuilt[prop] ?? "";
				if (isSameLook(wanted, drawn)) {
					return [];
				}

				const waiver = pair.waived?.[prop];
				const said = `${pair.name} ${prop}: board ${wanted} · built ${drawn}`;
				return waiver === undefined ? [said] : [`${WAIVED_MARK}${said} — ${waiver}`];
			});
		});
	} finally {
		board.close();
	}
}

async function trafficLightFailures(page: AskedPage): Promise<string[]> {
	const config: unknown = JSON.parse(readFileSync(TAURI_CONFIG, "utf8"));
	const at = JSON.stringify(config).match(/"trafficLightPosition":\{"x":(-?[\d.]+),"y":(-?[\d.]+)\}/);
	const header = await page.ask(CHAT_HEADER_CENTRE);
	const contentAxis = await page.ask(CHATS_CONTENT_AXIS);
	if (at === null || typeof header !== "number" || typeof contentAxis !== "number") {
		return ["traffic lights: no trafficLightPosition in the Tauri config, no chat header or no chats content axis"];
	}

	const lightLeft = Number(at[1]);
	const lightCentre = Number(at[2]) - LIGHT_TOP_UNDER_INSET_PX + LIGHT_PX / 2;
	return [
		...(Math.abs(lightCentre - header) <= 0.5
			? []
			: [`traffic lights centre-y ${lightCentre} · chat header centre-y ${header}`]),
		...(Math.abs(lightLeft - contentAxis) <= 0.5
			? []
			: [`first traffic light left ${lightLeft} · chats content axis ${contentAxis}`]),
	];
}

async function alignmentFailures(built: AskedPage, alignment: Alignment): Promise<string[]> {
	const said = await built.ask(`(${alignment.measure})()`);
	return typeof said === "string" ? [`${alignment.name}: ${said}`] : [];
}

const built = await paged(origin, "studio board diff", { size: VIEW });
const bare = await paged(`${origin}?bare`, "studio board diff, no essentials", { size: VIEW });
let total = 0;
try {
	await waited(1500);
	const boom = await built.ask(`document.getElementById("boom")?.textContent ?? ""`);
	if (typeof boom === "string" && boom !== "") {
		throw new Error(`the studio failed to draw: ${boom}`);
	}

	if (probe !== null) {
		console.log(JSON.stringify({ studio: await built.ask(probe), noEssentials: await bare.ask(probe) }, null, 1));
		writeFileSync(path.join(shotsAt, "probe.png"), await built.shoot());
	}

	for (const theme of probe === null ? THEMES : []) {
		await themed(built, theme);
		await themed(bare, theme);
		await built.hover(REST_POINT, REST_POINT);
		for (const scene of SCENES.filter((one) => onlyScene === null || one.name === onlyScene)) {
			const found = await sceneDifferences(built, scene, theme);
			total += found.filter((line) => !line.startsWith(WAIVED_MARK)).length;
			console.log(
				`\n${theme} · ${scene.name} (${scene.board}): ${found.length === 0 ? "no difference" : `${found.filter((line) => !line.startsWith(WAIVED_MARK)).length} differences`}`,
			);
			for (const line of found) {
				console.log(`  ${line}`);
			}
		}

		const misaligned = [
			...(await Promise.all(ALIGNMENTS.map((one) => alignmentFailures(built, one)))).flat(),
			...(await Promise.all(ALIGNMENTS.map((one) => alignmentFailures(bare, one))))
				.flat()
				.map((one) => `no essentials · ${one}`),
			...(await trafficLightFailures(built)),
		];
		total += misaligned.length;
		console.log(
			`\n${theme} · alignment: ${misaligned.length === 0 ? "every guide shared" : `${misaligned.length} off`}`,
		);
		for (const line of misaligned) {
			console.log(`  ${line}`);
		}
	}
} finally {
	built.close();
	bare.close();
	server.close();
}

console.log(
	`\nreal studio (${isShipped ? "shipped Tauri sheet" : "Tauri build of the sources"}) against the boards: ${total} differences · shots in ${shotsAt}`,
);
process.exitCode = total === 0 ? 0 : 1;
