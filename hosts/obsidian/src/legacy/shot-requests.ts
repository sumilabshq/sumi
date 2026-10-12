import { createElement as h } from "react";
import type { ReactElement } from "react";
import { requestUrl } from "obsidian";
import type { DataAdapter } from "obsidian";
import { ROOT } from "@widgetarium/core/paths.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { measuredFindingsIn } from "@widgetarium/core/page-measure.js";
import type { MeasuredFinding } from "@widgetarium/core/page-measure.js";
import { AppProvider, Slot, app } from "@widgetarium/core/mediator";
import type { App } from "@widgetarium/core/mediator";
import {
	CanvasShot,
	NoteBoardQuery,
	NoteShot,
	ShotCountQuery,
	canvasHost,
	canvasModule,
	whileAgentLooks,
} from "@widgetarium/canvas";
import type { AgentLook } from "@widgetarium/canvas";
import { drawnOffScreen, pictureTakerOf, pngOf, stackedPngOf } from "@widgetarium/canvas";
import type { ObsidianDesignHeld } from "@widgetarium/canvas";
import { CANVAS_OPENED_ON } from "@widgetarium/studio";
import type WidgetariumPlugin from "../main.js";

export const SHOTS_DIR = `${ROOT}/shots`;
export const SHOT_REQUESTS_DIR = `${SHOTS_DIR}/requests`;

const SHOT_POLL_MS = 1000;
const DESIGN_SCALE = 0.5;
const NOTE_SHOT = { width: 1280 } as const;

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
	readonly held: ObsidianDesignHeld;
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
	const { registry, host } = plugin;
	const place = { leafOf: () => plugin.app.workspace.getLeaf(false), fromNote: () => "" };
	const held = { obsidian: plugin.app, registry, host, jobs: plugin.assistant.jobs, place, fetchUrl: requestUrl };
	return { adapter: plugin.app.vault.adapter, held };
}

function shotAppOf(taker: ShotTaker, design: string): App {
	const opened = { ...CANVAS_OPENED_ON, app: design };
	return app({ modules: [canvasModule], host: canvasHost({ platform: "obsidian", opened, obsidian: taker.held }) });
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
	const { adapter } = taker;
	try {
		const shot = asked.design ? await shotWhileAgentLooks(taker, asked) : await noteShotOf(taker, asked.note);
		if (shot.measured) await adapter.write(`${SHOTS_DIR}/${id}.measured.json`, JSON.stringify(shot.measured));
		await adapter.writeBinary(`${SHOTS_DIR}/${id}.png`, shot.png);
	} catch (failure) {
		await adapter.write(`${SHOTS_DIR}/${id}.failed.txt`, failure instanceof Error ? failure.message : String(failure));
	}
}

function shotWhileAgentLooks(taker: ShotTaker, asked: ShotAsked): Promise<TakenShot> {
	const look: AgentLook = { app: asked.design, page: asked.page, frame: asked.frame };
	return whileAgentLooks(look, () => designShotOf(taker, look));
}

async function designShotOf(taker: ShotTaker, look: AgentLook): Promise<TakenShot> {
	const shotApp = shotAppOf(taker, look.app);
	const asked = { page: look.page, frame: look.frame };
	const counted = await shotApp.send(ShotCountQuery, asked);
	if (!counted.ok) throw new Error(counted.reason);
	const parts = Array.from({ length: counted.output.count }, (_, at) =>
		drawn(shotApp, h(CanvasShot, { asked: { ...asked, at } })),
	);
	if (look.page)
		return drawnOffScreen({}, parts[0] ?? null, async (node) => ({
			measured: measuredFindingsIn(node),
			png: await pngOf(requestUrl, node),
		}));
	const pictureOf = pictureTakerOf(requestUrl);
	const measured: MeasuredFinding[] = [];
	const canvases: HTMLCanvasElement[] = [];
	for (const part of parts) {
		const shot = await drawnOffScreen({}, part, async (node) => ({
			found: measuredFindingsIn(node),
			canvas: await pictureOf(node, DESIGN_SCALE),
		}));
		measured.push(...shot.found);
		canvases.push(shot.canvas);
	}
	return { measured, png: await stackedPngOf(canvases) };
}

// TRADE-OFF: only the note's board is drawn, not its markdown; a screen note holds nothing else.
async function noteShotOf(taker: ShotTaker, note: string): Promise<TakenShot> {
	const shotApp = shotAppOf(taker, "");
	const asked = { note, width: NOTE_SHOT.width };
	const board = await shotApp.send(NoteBoardQuery, asked);
	if (!board.ok) throw new Error(board.reason);
	const tree = drawn(shotApp, h(NoteShot, { asked }));
	return drawnOffScreen(NOTE_SHOT, tree, async (node) => ({ measured: null, png: await pngOf(requestUrl, node) }));
}

function drawn(shotApp: App, block: ReactElement): ReactElement {
	return h(AppProvider, { app: shotApp }, h(Slot, null, block));
}

function askedIn(text: string): ShotAsked {
	const parsed: unknown = JSON.parse(text);
	const textAt = (key: string): string => (isObject(parsed) && typeof parsed[key] === "string" ? parsed[key] : "");
	return { note: textAt("note"), design: textAt("design"), page: textAt("page"), frame: textAt("frame") };
}
