import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ROOT } from "@widgetarium/core/paths.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { measuredFindingsIn } from "@widgetarium/core/page-measure.js";
import type { MeasuredFinding } from "@widgetarium/core/page-measure.js";
import type { DataAdapter } from "obsidian";
import type WidgetariumPlugin from "../main.js";
import type { DrawnScreen } from "@widgetarium/studio";
import { CanvasShotWidget, frameLabelOf, pageOfScreen, screensOfPage, whileAgentLooks } from "@widgetarium/studio";
import type { AgentLook, Shot } from "@widgetarium/studio";
import { readDesign } from "@widgetarium/canvas";
import { boardIn, drawnOffScreen, ObsidianDesignSource, pngOf, stackedPngOf } from "@widgetarium/canvas/obsidian";

export const SHOTS_DIR = `${ROOT}/shots`;
export const SHOT_REQUESTS_DIR = `${SHOTS_DIR}/requests`;

const SHOT_POLL_MS = 1000;
const DESIGN_SCALE = 0.5;
const WIDGETS_PER_CHUNK = 4;
const NOTE_SHOT = { width: 1280 } as const;
const NO_NOTE = "{note} is not a note in this vault";
const NO_BOARD = "{note} holds no widgetarium board to draw";
const NO_PAGE = "{app} has no page {page} with a frame {frame}: its pages are {pages}";

interface TakenShot {
	readonly png: ArrayBuffer;
	readonly measured: readonly MeasuredFinding[] | null;
}

interface ShotAsked {
	readonly note: string;
	readonly design: string;
	readonly page: string;
	readonly frame: string;
}

interface ShotTaker {
	readonly adapter: DataAdapter;
	readonly source: ObsidianDesignSource;
}

export function answerShotRequests(plugin: WidgetariumPlugin): void {
	const taker = shotTakerOf(plugin);
	let isBusy = false;
	const poll = async (): Promise<void> => {
		if (isBusy) return;
		isBusy = true;
		await answerPending(taker).catch((failure: unknown) =>
			console.error("[widgetarium] a shot was not taken", failure),
		);
		isBusy = false;
	};
	plugin.registerInterval(window.setInterval(() => void poll(), SHOT_POLL_MS));
}

function shotTakerOf(plugin: WidgetariumPlugin): ShotTaker {
	const { app, registry, host } = plugin;
	const place = { leafOf: () => app.workspace.getLeaf(false), fromNote: () => "" };
	const source = new ObsidianDesignSource({ obsidian: app, registry, host, jobs: plugin.assistant.jobs, place });
	return { adapter: app.vault.adapter, source };
}

async function answerPending(taker: ShotTaker): Promise<void> {
	const { adapter } = taker;
	if (!(await adapter.exists(SHOT_REQUESTS_DIR))) return;
	const { files } = await adapter.list(SHOT_REQUESTS_DIR);
	for (const path of files.filter((one) => one.endsWith(".json"))) {
		const id = path.slice(path.lastIndexOf("/") + 1, -".json".length);
		const asked = askedIn(await adapter.read(path));
		await adapter.remove(path);
		await answerOne(taker, id, asked);
	}
}

async function answerOne(taker: ShotTaker, id: string, asked: ShotAsked): Promise<void> {
	const { adapter, source } = taker;
	try {
		const shot = asked.design ? await shotWhileAgentLooks(source, asked) : await noteShotOf(taker, asked.note);
		if (shot.measured) await adapter.write(`${SHOTS_DIR}/${id}.measured.json`, JSON.stringify(shot.measured));
		await adapter.writeBinary(`${SHOTS_DIR}/${id}.png`, shot.png);
	} catch (failure) {
		await adapter.write(`${SHOTS_DIR}/${id}.failed.txt`, failure instanceof Error ? failure.message : String(failure));
	}
}

function shotWhileAgentLooks(source: ObsidianDesignSource, asked: ShotAsked): Promise<TakenShot> {
	const look = { app: asked.design, page: asked.page, frame: asked.frame };
	return whileAgentLooks(look, () => (asked.page ? pageShotOf(source, look) : designShotOf(source, asked.design)));
}

async function pageShotOf(source: ObsidianDesignSource, look: AgentLook): Promise<TakenShot> {
	const design = (await readDesign(source, look.app)).design.value;
	const screens = framesNamed(screensOfPage(design.screens, look.page), look.frame);
	if (screens.length === 0) throw new Error(noPageSaid(look, design.screens));
	const tree = shotOf(source, { kind: "pages", screens });
	return drawnOffScreen({}, tree, async (node) => ({ measured: measuredFindingsIn(node), png: await pngOf(node) }));
}

function framesNamed(screens: readonly DrawnScreen[], frame: string): DrawnScreen[] {
	if (!frame) return [...screens];
	return screens
		.map((screen) => ({
			...screen,
			states: screen.states.filter((state) => state.name === frame || frameLabelOf(screen, state.name) === frame),
		}))
		.filter((screen) => screen.states.length > 0);
}

function noPageSaid(look: AgentLook, screens: readonly DrawnScreen[]): string {
	const pages = [...new Set(screens.map((screen) => pageOfScreen(screen.name)))].join(", ");
	return NO_PAGE.replace("{app}", look.app)
		.replace("{page}", look.page)
		.replace("{frame}", look.frame || "*")
		.replace("{pages}", pages);
}

function shotOf(source: ObsidianDesignSource, shot: Shot): ReactElement {
	return h(CanvasShotWidget, { shotQuery: shot, drawingQuery: source.drawing() });
}

async function designShotOf(source: ObsidianDesignSource, app: string): Promise<TakenShot> {
	const design = (await readDesign(source, app)).design.value;
	const shots: Shot[] = [
		{ kind: "references", references: design.references },
		...design.screens.map((screen): Shot => ({ kind: "pages", screens: [screen] })),
		...widgetBatchesOf(design.widgets).map((widgets): Shot => ({ kind: "widgets", widgets })),
	];
	const measured: MeasuredFinding[] = [];
	const canvases: HTMLCanvasElement[] = [];
	for (const shot of shots) {
		const drawn = await drawnOffScreen({}, shotOf(source, shot), async (node) => ({
			found: measuredFindingsIn(node),
			canvas: await source.pictureOf(node, DESIGN_SCALE),
		}));
		measured.push(...drawn.found);
		canvases.push(drawn.canvas);
	}
	return { measured, png: await stackedPngOf(canvases) };
}

function widgetBatchesOf<T>(widgets: readonly T[]): T[][] {
	const batches: T[][] = [];
	for (let at = 0; at < widgets.length; at += WIDGETS_PER_CHUNK)
		batches.push(widgets.slice(at, at + WIDGETS_PER_CHUNK));
	return batches;
}

// TRADE-OFF: only the note's board is drawn, not its markdown; a screen note holds nothing else.
async function noteShotOf(taker: ShotTaker, note: string): Promise<TakenShot> {
	const text = await taker.adapter.read(note).catch(() => null);
	if (text === null) throw new Error(NO_NOTE.replace("{note}", note));
	const board = boardIn(text);
	if (!board) throw new Error(NO_BOARD.replace("{note}", note));
	const tree = shotOf(taker.source, { kind: "board", board, width: NOTE_SHOT.width });
	return drawnOffScreen(NOTE_SHOT, tree, async (node) => ({ measured: null, png: await pngOf(node) }));
}

function askedIn(text: string): ShotAsked {
	const parsed: unknown = JSON.parse(text);
	const textAt = (key: string): string => (isObject(parsed) && typeof parsed[key] === "string" ? parsed[key] : "");
	return { note: textAt("note"), design: textAt("design"), page: textAt("page"), frame: textAt("frame") };
}
