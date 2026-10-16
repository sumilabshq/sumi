import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DataAdapter, Stat } from "obsidian";
import { render } from "../packages/core/src/engine/render.js";
import { AppProvider, OnRefused, useCommand } from "../packages/core/src/requests/index.ts";
import type { CommandHandle, CommandRefusal } from "../packages/core/src/requests/index.ts";
import type { WidgetRegistry } from "../packages/core/src/registry.ts";
import { ObsidianDesignFiles } from "../packages/canvas/adapters/design-files/obsidian.adapter.ts";
import { canvasAppOver, canvasPartsOver } from "./canvas-hosts.ts";
import { polledChanges } from "../packages/canvas/adapters/design-folder/obsidian/design-changes.ts";
import { shownWidgetsOf } from "../packages/canvas/shared/lib/design/shown-widgets.ts";
import { AddPhotosCommand } from "../packages/canvas/features/photos/contract.ts";
import { normalizeBoard } from "../packages/core/src/model.ts";
import type { WidgetDefinition } from "../packages/core/src/registry.ts";
import { present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

type Check = (what: string, held: unknown, wanted: unknown) => void;

const WRITE_FAILED = "the disk is full";
const drawn: CommandHandle<{ photos: File[] }, void>[] = [];

export async function checkVaultDesign(check: Check, settle: () => Promise<void>): Promise<void> {
	await checkFailedWrite(check, settle);
	await checkPolling(check);
	checkShownWidgets(check);
}

async function checkFailedWrite(check: Check, settle: () => Promise<void>): Promise<void> {
	const failing = (): Promise<never> => Promise.reject(new Error(WRITE_FAILED));
	const adapter = {
		exists: failing,
		read: failing,
		mkdir: failing,
		writeBinary: failing,
		write: failing,
		process: failing,
	};
	const opened = { app: "Farm", page: "", isLayersOpen: false, mode: "hand" as const };
	const parts = canvasPartsOver({ opened, ownsPaste: () => true }, { designFiles: new ObsidianDesignFiles(adapter) });
	const canvasApp = canvasAppOver(parts);
	const heard: CommandRefusal[] = [];
	const node = document.createElement("div");
	document.body.append(node);
	const hearing = h(
		OnRefused,
		{ value: (refusal: CommandRefusal) => heard.push(refusal) },
		h(AppProvider, { app: canvasApp }, h(PhotoView)),
	);
	render(hearing, node);
	await settle();
	const view = present(drawn.at(-1), "a drawn photo view");
	const answer = await view.run({ photos: [new File(["x"], "a.png")] });
	await settle();
	check(
		"a design write the vault refuses is answered not ok and reaches the one refusal handler once",
		[answer.ok, heard.map((refusal) => refusal.reason.includes(WRITE_FAILED))],
		[false, [true]],
	);
	render(null, node);
	node.remove();
}

interface HeldStat {
	readonly answer: (mtime: number) => void;
}

async function checkPolling(check: Check): Promise<void> {
	const asked: HeldStat[] = [];
	const stat = (): Promise<Stat | null> =>
		new Promise((done) => asked.push({ answer: (mtime) => done({ type: "file", ctime: 0, mtime, size: 0 }) }));
	const vault = {
		adapter: standIn<DataAdapter>({ stat }, ["stat"], "adapter"),
		registry: standIn<WidgetRegistry>({ get: () => null }, ["get"], "registry"),
	};
	const ticks: (() => void)[] = [];
	const realInterval = window.setInterval;
	const realClear = window.clearInterval;
	Reflect.set(window, "setInterval", (tick: () => void) => ticks.push(tick));
	Reflect.set(window, "clearInterval", () => undefined);
	let changes = 0;
	try {
		const stop = polledChanges(
			vault,
			"Farm",
			() => undefined,
			() => (changes += 1),
		);
		const tick = present(ticks[0], "the poll timer");
		const answerAll = async (mtime: number): Promise<void> => {
			for (const one of asked.splice(0)) one.answer(mtime);
			await new Promise((done) => setTimeout(done, 0));
		};
		tick();
		await answerAll(1);
		tick();
		tick();
		const statsWhileBusy = asked.length;
		stop();
		await answerAll(2);
		check(
			"a poll in flight blocks the next, and one ending after stop tells no change",
			[statsWhileBusy, changes],
			[3, 0],
		);
	} finally {
		Reflect.set(window, "setInterval", realInterval);
		Reflect.set(window, "clearInterval", realClear);
	}
}

function checkShownWidgets(check: Check): void {
	const drawable = (states: object): WidgetDefinition =>
		standIn<WidgetDefinition>({ component: () => null, states }, ["component"], "definition");
	const FULL = { Full: {} };
	const held = new Map<string, WidgetDefinition>([
		["stated", drawable(FULL)],
		["stateless", drawable({})],
		["pictured", drawable(FULL)],
		["aside", drawable({})],
		["undrawn", standIn<WidgetDefinition>({ states: FULL }, [], "definition")],
	]);
	const tiles = ["stated", "stateless", "pictured"].map((widget) => ({ id: widget, widget }));
	const board = normalizeBoard({ v: 2, tiles, layout: { dir: "column", of: tiles.map(({ id }) => ({ id })) } });
	const picture = { widget: "pictured", props: {}, mounts: null };
	const screens = [{ name: "Home", states: [{ name: "Home", board, picture }] }];
	check(
		"a widget is shown beside the screens unless a screen already draws all of it",
		shownWidgetsOf({ get: (id) => held.get(id ?? "") ?? null }, [...held.keys(), "stated"], screens),
		["stated", "aside"],
	);
}

function PhotoView(): ReactElement {
	drawn.push(useCommand(AddPhotosCommand));
	return h("p", null, "photos");
}
