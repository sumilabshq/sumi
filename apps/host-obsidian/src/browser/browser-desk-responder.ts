import type { DataAdapter } from "obsidian";
import { IS_PRODUCTION_BUILD } from "widgetarium:build-stamp";
import { CapturePageCommand, InkOpenAddressCommand, ReadPageContentCommand } from "@widgetarium/browser";
import type { Answer, StartedApp } from "@widgetarium/core/requests";
import { reportsBasePath } from "../legacy/desktop-adapter.js";
import {
	DESK_KEEPS_MS,
	DESK_WAIT_MS,
	DeskAskSchema,
	deskFoldersOf,
	deskPlaceOfProcess,
	deskRootOf,
	foldersToMake,
} from "./browser-desk.js";
import type { DeskAnswer, DeskAsk, DeskFolders } from "./browser-desk.js";
import { refuseInkBrowser } from "./ink-browser-switch.js";
import { PrivateFiles } from "./private-files.js";
import { randomHex } from "./random-hex.js";

type NodeFs = typeof import("node:fs");

export interface Desk {
	readonly fs: NodeFs;
	readonly files: PrivateFiles;
	readonly folders: DeskFolders;
	readonly deskApp: StartedApp;
	readonly token: string;
	readonly refusal: string | null;
}

export interface DeskOpening {
	readonly fs: NodeFs;
	readonly root: string;
	readonly vaultPath: string;
	readonly browserApp: StartedApp;
	readonly uid: number | null;
	readonly isProductionBuild: boolean;
}

const ASKED_FILE = /^([0-9a-f]+)\.json$/;
const NOT_AN_ASK = "the browser desk could not read this ask";
const NOT_THIS_DESK = "this ask does not carry the browser desk's token";
const NO_URL = "open needs the address of the page";

export function openBrowserDesk(adapter: DataAdapter, browserApp: StartedApp): Desk | null {
	if (typeof require !== "function" || !reportsBasePath(adapter)) {
		return null;
	}

	const fs: NodeFs = require("node:fs");
	const os: typeof import("node:os") = require("node:os");
	return openDeskAt({
		fs,
		root: deskRootOf(deskPlaceOfProcess(os)),
		vaultPath: fs.realpathSync(adapter.getBasePath()),
		browserApp,
		uid: process.getuid?.() ?? null,
		isProductionBuild: IS_PRODUCTION_BUILD,
	});
}

export function openDeskAt(opening: DeskOpening): Desk {
	const files = new PrivateFiles(opening.fs, opening.uid);
	const folders = deskFoldersOf(opening.root, opening.vaultPath);
	files.makeFolders(foldersToMake(folders));
	const desk: Desk = {
		fs: opening.fs,
		files,
		folders,
		deskApp: opening.browserApp,
		token: randomHex(),
		refusal: refuseInkBrowser(opening.isProductionBuild),
	};
	files.write(folders.token, desk.token);
	sweepDesk(desk);
	return desk;
}

export async function answerPendingAsks(desk: Desk): Promise<void> {
	const fresh = desk.fs
		.readdirSync(desk.folders.asks)
		.map((name) => ASKED_FILE.exec(name)?.[1])
		.filter((id): id is string => id !== undefined);

	if (fresh.length === 0) {
		return;
	}

	sweepDesk(desk);
	await Promise.all(fresh.map((id) => answerOne(desk, id)));
}

function sweepDesk(desk: Desk): void {
	const now = Date.now();
	desk.files.removeOlderThan(desk.folders.shots, DESK_KEEPS_MS, now);
	desk.files.removeOlderThan(desk.folders.answers, DESK_WAIT_MS, now);
	desk.files.removeOlderThan(desk.folders.asks, DESK_KEEPS_MS, now);
}

async function answerOne(desk: Desk, id: string): Promise<void> {
	const taken = `${desk.folders.asks}/${id}.taken`;

	try {
		desk.fs.renameSync(`${desk.folders.asks}/${id}.json`, taken);
	} catch {
		return;
	}

	try {
		const answer = await answerTaken(desk, id, taken);
		desk.files.write(`${desk.folders.answers}/${id}.json`, JSON.stringify(answer));
	} finally {
		desk.files.remove(taken);
	}
}

async function answerTaken(desk: Desk, id: string, taken: string): Promise<DeskAnswer> {
	const ask = askOf(desk, taken);

	if (ask === null) {
		return refusalOf(NOT_AN_ASK);
	}

	if (ask.token !== desk.token) {
		return refusalOf(NOT_THIS_DESK);
	}

	return desk.refusal === null ? answerAsk(desk, id, ask) : refusalOf(desk.refusal);
}

function askOf(desk: Desk, taken: string): DeskAsk | null {
	try {
		const parsed = DeskAskSchema.safeParse(JSON.parse(desk.files.read(taken)));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

async function answerAsk(desk: Desk, id: string, ask: DeskAsk): Promise<DeskAnswer> {
	switch (ask.verb) {
		case "read":
			return deskAnswerOf(await desk.deskApp.send(ReadPageContentCommand));
		case "open":
			return answerOpen(desk, ask.url);
		case "shot":
			return answerShot(desk, id, ask.region ?? null);
	}
}

async function answerOpen(desk: Desk, url: string | undefined): Promise<DeskAnswer> {
	if (!url) {
		return refusalOf(NO_URL);
	}

	return deskAnswerOf(await desk.deskApp.send(InkOpenAddressCommand, { url }));
}

async function answerShot(desk: Desk, id: string, region: DeskAsk["region"] | null): Promise<DeskAnswer> {
	const shot = await desk.deskApp.send(CapturePageCommand, { region: region ?? null });

	if (!shot.ok) {
		return deskAnswerOf(shot);
	}

	const path = `${desk.folders.shots}/${id}.png`;
	desk.files.write(path, Buffer.from(shot.output.png, "base64"));
	return {
		ok: true,
		output: {
			path,
			url: shot.output.url,
			width: shot.output.width,
			height: shot.output.height,
		},
	};
}

function deskAnswerOf(answer: Answer<unknown>): DeskAnswer {
	return answer.ok
		? {
				ok: true,
				output: answer.output,
			}
		: refusalOf(answer.reason);
}

function refusalOf(reason: string): DeskAnswer {
	return {
		ok: false,
		reason,
	};
}
