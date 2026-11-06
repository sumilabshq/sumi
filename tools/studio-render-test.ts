import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import esbuild from "esbuild";
import { ASSISTANT_NOT_AVAILABLE } from "../packages/shared/core/src/engine/assistant-port.ts";
import { NO_GPU } from "../apps/studio/src/features/canvas/lib/use-gpu-frame.ts";
import {
	catalogueImportsIn,
	checkCatalogueAbsentInApp,
	checkCataloguePanel,
	checkCatalogueSheetSplit,
} from "./studio-render-catalogue.ts";
import type { CatalogueSeen } from "./studio-render-catalogue.ts";
import { bundleOf, findBrowser } from "./harness.ts";
import { MEASURE_SCRIPT } from "./studio-render-measure.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

interface Seen extends CatalogueSeen {
	readonly routeDom?: string | null;
	readonly routeTop?: number | null;
	readonly appHeadBottom?: number | null;
	readonly studioElements?: number;
	readonly menuInChatHead?: boolean;
	readonly openedOnCanvas?: boolean;
	readonly aiButtons?: number;
	readonly underSystemButtons?: readonly string[];
	readonly sentTurn?: string | null;
	readonly sent?: readonly string[] | null;
	readonly specTitle?: string | null;
	readonly built?: readonly string[] | null;
	readonly scrolledTo?: readonly string[];
	readonly setupFailure?: string | null;
	readonly chatAfterSetupFailure?: boolean;
	readonly sendFailure?: string | null;
	readonly draftBack?: string | null;
	readonly quietSaid?: string | null;
	readonly frameWithQuiet?: boolean;
	readonly canvasShown?: boolean;
	readonly taskGoneInCanvas?: boolean;
	readonly frames?: readonly string[];
	readonly frameNotDrawn?: string | null;
	readonly canvasTopBars?: number;
	readonly zoneInAppHead?: boolean;
	readonly menuInChatInCanvas?: boolean;
	readonly transformBefore?: string;
	readonly transformZoomed?: string;
	readonly transformPanned?: string;
	readonly locationInCanvas?: string;
	readonly cards?: readonly string[];
	readonly pageChoices?: readonly string[];
	readonly routeTriggerHit?: boolean | null;
	readonly cardNotDrawn?: string | null;
	readonly backSaid?: string | null;
	readonly backShowsRoute?: boolean;
	readonly routeDomBack?: string | null;
	readonly navigated?: boolean;
	readonly memoryLeftTask?: boolean;
	readonly locationAfter?: string;
	readonly param?: unknown;
	readonly navigatedBack?: boolean;
	readonly paramAfter?: unknown;
}

type Mode = "app" | "studio" | "studio-mac" | "studio-memory";

const VIEW = { width: 1800, height: 900 };
const REACT_ID = /«[^»]*»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g;
const REGION_WIDTH = /flex: 0 0 \d+px/g;
const APP_ENTRY = "packages/shared/core/src/app.ts";
const STUDIO_FOLDERS = ["apps/studio/", "packages/domain/workspaces/"];

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-render"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = BROWSER_SHEET_SOURCES.map((at) => readFileSync(at, "utf8")).join("\n");

// TRADE-OFF: headless Chrome under a virtual time budget runs one animation frame; timers stand in for the rest
const FRAMES_BY_TIMER = `window.requestAnimationFrame = (step) => setTimeout(() => step(performance.now()), 16); window.cancelAnimationFrame = (frame) => clearTimeout(frame);`;

function pageOf(mode: Mode): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets}</style>
</head><body><div id="root"></div>
<pre id="boom"></pre><pre id="seen"></pre>
<script>window.__MODE__=${JSON.stringify(mode)};</script>
${mode === "studio" ? `<script>${FRAMES_BY_TIMER}</script>` : ""}
<script>${bundle}</script>
<script>${MEASURE_SCRIPT}</script>
</body></html>`;
}

function textOfPre(dom: string, id: string): string {
	const open = `<pre id="${id}">`;
	const from = dom.indexOf(open);
	if (from === -1) return "";
	const start = from + open.length;
	return dom
		.slice(start, dom.indexOf("</pre>", start))
		.replaceAll("&quot;", '"')
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&")
		.trim();
}

const served = { page: "" };
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(served.page);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

async function chromeAt(extra: readonly string[]): Promise<string> {
	const profile = mkdtempSync(path.join(tmpdir(), "wg-studio-render-profile-"));
	try {
		const { stdout } = await promisify(execFile)(
			findBrowser("studio render"),
			[
				"--headless",
				"--disable-gpu",
				"--no-sandbox",
				"--hide-scrollbars",
				`--user-data-dir=${profile}`,
				`--window-size=${VIEW.width},${VIEW.height}`,
				"--virtual-time-budget=12000",
				...extra,
				origin,
			],
			{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
		return stdout;
	} finally {
		rmSync(profile, {
			recursive: true,
			force: true,
			maxRetries: 3,
		});
	}
}

async function seenIn(mode: Mode): Promise<{ readonly seen: Seen; readonly reported: string }> {
	served.page = pageOf(mode);
	writeFileSync(path.join(shotsAt, `${mode}.html`), served.page);
	await chromeAt([`--screenshot=${path.join(shotsAt, `${mode}.png`)}`]);
	const dom = await chromeAt(["--dump-dom", "--force-prefers-reduced-motion"]);
	const parsed: unknown = JSON.parse(textOfPre(dom, "seen") || "{}");
	return { seen: parsed !== null && typeof parsed === "object" ? parsed : {}, reported: textOfPre(dom, "boom") };
}

function sameList(got: readonly string[] | undefined, wanted: readonly string[]): boolean {
	return JSON.stringify(got ?? []) === JSON.stringify(wanted);
}

function scaleOf(transform: string | undefined): number {
	const scale = /scale\(([\d.]+)\)/.exec(transform ?? "")?.[1];
	return scale === undefined ? Number.NaN : Number(scale);
}

function withoutReactIds(dom: string | null | undefined): string {
	return (dom ?? "").replace(REACT_ID, "id");
}

function withoutRegionWidths(dom: string | null | undefined): string {
	return withoutReactIds(dom).replace(REGION_WIDTH, "flex: 0 0 width");
}

async function studioModulesInAppEntry(): Promise<string[]> {
	const built = await esbuild.build({
		entryPoints: [APP_ENTRY],
		bundle: true,
		write: false,
		metafile: true,
		format: "esm",
		platform: "browser",
		conditions: ["source"],
		packages: "external",
		logLevel: "silent",
	});
	const { inputs } = built.metafile;
	return [
		...Object.keys(inputs).filter((input) => STUDIO_FOLDERS.some((folder) => input.includes(folder))),
		...catalogueImportsIn(inputs),
	];
}

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const app = await seenIn("app");
check("app mode drew without a failure", app.reported === "", app.reported);
check("app mode draws no studio element", app.seen.studioElements === 0, app.seen.studioElements);
checkCatalogueAbsentInApp(app.seen, check);
check("app mode draws the route", (app.seen.routeDom ?? "").includes("Water the ferns"), app.seen.routeTop);

const studio = await seenIn("studio");
check("studio drew without a failure", studio.reported === "", studio.reported);
check("the studio opens on the canvas", studio.seen.openedOnCanvas === true, studio.seen.openedOnCanvas);
check("the menu stands in the chat plate's header", studio.seen.menuInChatHead === true, studio.seen.menuInChatHead);
check("no AI button is left to close the chat", studio.seen.aiButtons === 0, studio.seen.aiButtons);
check(
	"the route starts below the app plate's header",
	typeof studio.seen.routeTop === "number" &&
		typeof studio.seen.appHeadBottom === "number" &&
		studio.seen.routeTop >= studio.seen.appHeadBottom,
	{ routeTop: studio.seen.routeTop, headBottom: studio.seen.appHeadBottom },
);
check(
	"the route's DOM in the app plate equals app mode's, but for the region width the narrower plate lays",
	withoutRegionWidths(studio.seen.routeDom) === withoutRegionWidths(app.seen.routeDom),
	withoutReactIds(studio.seen.routeDom).length,
);
check(
	"a message typed and sent reaches the port and shows as a turn",
	studio.seen.sentTurn === "Plant the beans" && sameList(studio.seen.sent ?? [], ["Plant the beans"]),
	{ turn: studio.seen.sentTurn, sent: studio.seen.sent },
);
check("the chat draws the spec card the port's cards name", studio.seen.specTitle === "Farm", studio.seen.specTitle);
check(
	"and its Build it asks the port to build that app",
	sameList(studio.seen.built ?? [], ["Farm"]),
	studio.seen.built,
);
check(
	"a press on a working app's line scrolls this chat's card, never another chat's",
	sameList(studio.seen.scrolledTo ?? [], ["this chat"]),
	studio.seen.scrolledTo,
);
check(
	"a setup that fails to read again keeps the chat on screen",
	studio.seen.chatAfterSetupFailure === true,
	studio.seen.chatAfterSetupFailure,
);
check(
	"and says so on the quiet failure line",
	(studio.seen.setupFailure ?? "").includes("the fake vault is gone"),
	studio.seen.setupFailure,
);
check(
	"a send the port refuses says so above the composer",
	(studio.seen.sendFailure ?? "").includes("the fake provider refuses"),
	studio.seen.sendFailure,
);
check("and puts the draft back into the box", studio.seen.draftBack === "Break the fence", studio.seen.draftBack);
checkCataloguePanel(studio.seen, check);
check("Edit in canvas swaps the route for the canvas", studio.seen.canvasShown === true, studio.seen.canvasShown);
check("and the route leaves the app plate", studio.seen.taskGoneInCanvas === true, studio.seen.taskGoneInCanvas);
check(
	"the canvas is the design canvas: its page picker holds every route page and Components",
	sameList(studio.seen.pageChoices, ["/", "/done/:id", "Components"]),
	studio.seen.pageChoices,
);
check(
	"the canvas draws its controls in the app plate's header, never a header row of its own",
	studio.seen.zoneInAppHead === true && studio.seen.canvasTopBars === 0,
	{ zoneInAppHead: studio.seen.zoneInAppHead, canvasTopBars: studio.seen.canvasTopBars },
);
check(
	"in the canvas the menu stays in the chat plate's header",
	studio.seen.menuInChatInCanvas === true,
	studio.seen.menuInChatInCanvas,
);
check("the first route is the shown page's frame", sameList(studio.seen.frames, ["/"]), studio.seen.frames);
check(
	"a route frame on a host lending no GPU says it is not drawn, and why",
	studio.seen.frameNotDrawn === NO_GPU,
	studio.seen.frameNotDrawn,
);
check("a zoom changes the field's scale", scaleOf(studio.seen.transformZoomed) > scaleOf(studio.seen.transformBefore), [
	studio.seen.transformBefore,
	studio.seen.transformZoomed,
]);
check(
	"a pan moves the field",
	(studio.seen.transformPanned ?? "") !== "" && studio.seen.transformPanned !== studio.seen.transformZoomed,
	studio.seen.transformPanned,
);
check(
	"panning and zooming never navigate the studio",
	studio.seen.locationInCanvas === "/",
	studio.seen.locationInCanvas,
);
check(
	"the Components page holds a card per widget state",
	sameList(studio.seen.cards, ["Full", "Empty"]),
	studio.seen.cards,
);
check(
	"a state card on a host lending no GPU says it is not drawn, and why",
	studio.seen.cardNotDrawn === NO_GPU,
	studio.seen.cardNotDrawn,
);
check(
	"a press on the route's popover trigger reaches it",
	studio.seen.routeTriggerHit === true,
	studio.seen.routeTriggerHit,
);
check(
	"the app plate's More menu offers Back to Farm, and it brings the route back",
	studio.seen.backSaid === "Back to Farm" && studio.seen.backShowsRoute === true,
	{ said: studio.seen.backSaid, shown: studio.seen.backShowsRoute },
);
check(
	"and its DOM equals the route's before the canvas",
	withoutReactIds(studio.seen.routeDomBack) === withoutReactIds(studio.seen.routeDom),
	withoutReactIds(studio.seen.routeDomBack).length,
);

const mac = await seenIn("studio-mac");
check("a host with no apps drew without a failure", mac.reported === "", mac.reported);
check(
	"a host with no assistant says so in the chat, and the frame stays",
	mac.seen.quietSaid === ASSISTANT_NOT_AVAILABLE && mac.seen.frameWithQuiet === true,
	{ quiet: mac.seen.quietSaid, frame: mac.seen.frameWithQuiet },
);
check(
	"with the host's window buttons inset 76px by 35px, no studio control stands under them",
	Array.isArray(mac.seen.underSystemButtons) && mac.seen.underSystemButtons.length === 0,
	mac.seen.underSystemButtons,
);

const memory = await seenIn("studio-memory");
check("a studio over an opened project drew without a failure", memory.reported === "", memory.reported);
check(
	"a memory router draws the route it starts at",
	(memory.seen.routeDom ?? "").includes("Water the ferns"),
	memory.seen.routeTop,
);
check("and navigates to another route", memory.seen.navigated === true && memory.seen.memoryLeftTask === true, {
	navigated: memory.seen.navigated,
	left: memory.seen.memoryLeftTask,
});
check("without touching the page's own location", memory.seen.locationAfter === "/", memory.seen.locationAfter);
check("writing the route's params under the key it was given", memory.seen.param === "7", memory.seen.param);
check(
	"and a route without that param does not read it",
	memory.seen.navigatedBack === true && (memory.seen.paramAfter ?? null) === null,
	{ navigatedBack: memory.seen.navigatedBack, paramAfter: memory.seen.paramAfter },
);

server.close();
const leaked = await studioModulesInAppEntry();
check("the app entry bundles no studio module and no catalogue pack", leaked.length === 0, leaked);
checkCatalogueSheetSplit(sheets, check);

console.log(`shots in ${shotsAt}`);
if (failed > 0) {
	console.log(`studio render: ${failed} failed`);
	process.exit(1);
}
console.log("studio render: clean");
