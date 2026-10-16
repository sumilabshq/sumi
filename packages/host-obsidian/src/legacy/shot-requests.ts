import { createElement as h } from "react";
import type { ReactElement } from "react";
import { requestUrl } from "obsidian";
import { z } from "zod";
import { ROOT } from "@widgetarium/core/paths.js";
import { measuredFindingsIn } from "@widgetarium/core/page-measure.js";
import type { MeasuredFinding } from "@widgetarium/core/page-measure.js";
import { AppProvider, Slot, app, reasonOf, reportToConsole } from "@widgetarium/core/requests";
import type { FailureReport, StartedApp } from "@widgetarium/core/requests";
import {
	CanvasShot,
	EndAgentLookCommand,
	NoteBoardQuery,
	NoteShot,
	ShotCountQuery,
	StartAgentLookCommand,
} from "@widgetarium/canvas";
import type { AgentLook } from "@widgetarium/canvas";
import { CanvasClientModule } from "@widgetarium/canvas/module";
import { detachedHostOf, drawnOffScreen, pictureTakerOf, pngOf, stackedPngOf } from "@widgetarium/canvas/adapters";
import { CANVAS_OPENED_ON } from "@widgetarium/studio";
import { HELD_IN_VAULT, partsFor } from "./design-held.js";
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

const ShotAskedSchema = z.object({
	note: z.string().default(""),
	design: z.string().default(""),
	page: z.string().default(""),
	frame: z.string().default(""),
});

type ShotAsked = z.output<typeof ShotAskedSchema>;

interface ShotTaker {
	readonly plugin: WidgetariumPlugin;
	readonly reportFailure: FailureReport;
}

const SHOTS = "shot requests";

export function answerShotRequests(plugin: WidgetariumPlugin): void {
	const taker: ShotTaker = { plugin, reportFailure: reportToConsole };
	const polling = { isBusy: false };
	const poll = async (): Promise<void> => {
		if (polling.isBusy) return;
		polling.isBusy = true;
		await answerPending(taker).catch((failure: unknown) => reportShotFailure(taker, SHOTS, failure));
		polling.isBusy = false;
	};
	plugin.registerInterval(window.setInterval(() => void poll(), SHOT_POLL_MS));
}

function shotAppOf({ plugin, reportFailure }: ShotTaker, design: string): StartedApp {
	const parts = partsFor(plugin, HELD_IN_VAULT, detachedHostOf({ ...CANVAS_OPENED_ON, app: design }));
	return app({ modules: [CanvasClientModule.with(parts)], host: { reportFailure } });
}

function reportShotFailure({ reportFailure }: ShotTaker, source: string, thrown: unknown): void {
	reportFailure({ source, reason: reasonOf(thrown), code: "failed", ran: false, thrown });
}

async function answerPending(taker: ShotTaker): Promise<void> {
	const { adapter } = taker.plugin.app.vault;
	if (!(await adapter.exists(SHOT_REQUESTS_DIR))) return;
	const { files } = await adapter.list(SHOT_REQUESTS_DIR);
	for (const path of files.filter((one) => one.endsWith(".json")))
		await answerOne(taker, path).catch((failure: unknown) => reportShotFailure(taker, path, failure));
}

async function answerOne(taker: ShotTaker, path: string): Promise<void> {
	const { adapter } = taker.plugin.app.vault;
	const id = path.slice(path.lastIndexOf("/") + 1, -".json".length);
	try {
		const asked = ShotAskedSchema.parse(JSON.parse(await adapter.read(path)));
		const shot = asked.design ? await shotWhileAgentLooks(taker, asked) : await noteShotOf(taker, asked.note);
		if (shot.measured) await adapter.write(`${SHOTS_DIR}/${id}.measured.json`, JSON.stringify(shot.measured));
		await adapter.writeBinary(`${SHOTS_DIR}/${id}.png`, shot.png);
	} catch (failure) {
		reportShotFailure(taker, path, failure);
		await adapter.write(`${SHOTS_DIR}/${id}.failed.txt`, reasonOf(failure));
	}
	await adapter.remove(path);
}

async function shotWhileAgentLooks(taker: ShotTaker, asked: ShotAsked): Promise<TakenShot> {
	const look: AgentLook = { app: asked.design, page: asked.page, frame: asked.frame };
	const shotApp = shotAppOf(taker, look.app);
	await shotApp.send(StartAgentLookCommand, look);
	try {
		const shot = await designShotOf(shotApp, look);
		await shotApp.send(EndAgentLookCommand, { isFailed: false });
		return shot;
	} catch (failure) {
		await shotApp.send(EndAgentLookCommand, { isFailed: true });
		throw failure;
	}
}

async function designShotOf(shotApp: StartedApp, look: AgentLook): Promise<TakenShot> {
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

function drawn(shotApp: StartedApp, block: ReactElement): ReactElement {
	return h(AppProvider, { app: shotApp }, h(Slot, null, block));
}
