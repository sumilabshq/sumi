import { app, module, provided } from "../packages/core/src/mediator/index.ts";
import type { App as MediatorApp } from "../packages/core/src/mediator/index.ts";
import { canvasModule } from "../packages/canvas/canvas.module.ts";
import { canvasHost } from "../packages/canvas/ports/canvas-host.ts";
import { DesignSource } from "../packages/canvas/ports/design-source.port.ts";
import { whileAgentLooks } from "../packages/canvas/requests/agent/agent-looks.ts";
import { ShowAgentPageCommand } from "../packages/canvas/requests/agent/show-agent-page.ts";
import { PageTabsQuery } from "../packages/canvas/requests/pages/page-tabs.ts";
import { PickVariantCommand } from "../packages/canvas/requests/pages/pick-variant.ts";
import { PastePhotosCommand } from "../packages/canvas/requests/photos/paste-photos.ts";
import { CanvasStore, createCanvasStore } from "../packages/canvas/requests/view/canvas-store.ts";
import type { DrawnDesign } from "../packages/canvas/schema/design.ts";
import { ModuleRegistry } from "../packages/core/src/engine/module-registry.js";
import type { StartedProject } from "../packages/core/src/app/widgetarium-app.js";
import { standIn } from "./stand-in.ts";

type Check = (what: string, held: unknown, wanted: unknown) => void;

interface HeldSource {
	readonly source: DesignSource;
	readonly release: () => void;
	readonly watching: { started: number; stopped: number };
	readonly photos: File[][];
}

const DESIGN: DrawnDesign = {
	screens: [
		{ name: "Home", states: [] },
		{ name: "Other", states: [] },
	],
	references: [],
	widgets: [],
};
const refusedHere = (): Promise<never> => Promise.reject(new Error("not in this check"));

export async function checkCanvasRequests(check: Check): Promise<void> {
	await checkPickAfterPageTurn(check);
	await checkWatchStopsOnce(check);
	await checkPasteOwner(check);
	await checkObsidianBuildOverProject(check);
}

async function checkObsidianBuildOverProject(check: Check): Promise<void> {
	const project = standIn<StartedProject>(
		{ registry: new ModuleRegistry({}), routes: [], hostOf: () => ({}) },
		["registry", "routes", "hostOf"],
		"project",
	);
	const opened = { app: "Farm", page: "", isLayersOpen: false, mode: "hand" as const };
	const host = canvasHost({ platform: "web", opened, project, ownsPaste: () => false });
	Reflect.set(globalThis, "__WG_PLATFORM__", "obsidian");
	try {
		const trailing = async (): Promise<unknown> => {
			const tabs = await app({ modules: [canvasModule], host }).send(PageTabsQuery, undefined);
			return tabs.ok ? tabs.output.trailing : tabs.reason;
		};
		check(
			"built for Obsidian, a canvas over a project with no design folder reads the project's design",
			await trailing().catch((failure: unknown) => (failure instanceof Error ? failure.message : String(failure))),
			["Components"],
		);
	} finally {
		Reflect.deleteProperty(globalThis, "__WG_PLATFORM__");
	}
}

async function checkPickAfterPageTurn(check: Check): Promise<void> {
	const held = heldSource();
	const reasons: string[] = [];
	const canvas = canvasOver(held.source, reasons);
	const picking = canvas.send(PickVariantCommand, { screen: "Home B" });
	await whileAgentLooks({ app: "Farm", page: "Other", frame: "" }, () => canvas.send(ShowAgentPageCommand, undefined));
	held.release();
	await picking;
	check("a variant pick whose page turned while the design was read writes nothing", reasons, [
		"show Other, where the agent looks",
	]);
}

async function checkWatchStopsOnce(check: Check): Promise<void> {
	const held = heldSource();
	const canvas = canvasOver(held.source, []);
	const stopFirst = canvas.watch(PageTabsQuery, undefined, () => undefined);
	stopFirst();
	const stopSecond = canvas.watch(PageTabsQuery, undefined, () => undefined);
	stopFirst();
	check("a watch stopped twice stops its own watch once and leaves the next one", held.watching, {
		started: 2,
		stopped: 1,
	});
	stopSecond();
}

async function checkPasteOwner(check: Check): Promise<void> {
	const held = heldSource();
	let isOwner = false;
	const canvas = canvasOver(held.source, [], () => isOwner);
	const photo = new File(["x"], "a.png");
	const elsewhere = await canvas.send(PastePhotosCommand, { photos: [photo] }, { idempotencyKey: "elsewhere" });
	isOwner = true;
	const here = await canvas.send(PastePhotosCommand, { photos: [photo] }, { idempotencyKey: "here" });
	check(
		"a paste the host does not own writes nothing into the design; one it owns does",
		[elsewhere.ok && elsewhere.output.isTaken, here.ok && here.output.isTaken, held.photos.length],
		[false, true, 1],
	);
}

function canvasOver(source: DesignSource, reasons: string[], ownsPaste = (): boolean => false): MediatorApp {
	const provide = canvasModule.provide.map((pair) => {
		if (pair.token === DesignSource) return provided(DesignSource, () => source);
		if (pair.token !== CanvasStore) return pair;
		return provided(CanvasStore, () => recordingStore(reasons));
	});
	const opened = { app: "Farm", page: "Home", isLayersOpen: false, mode: "hand" as const };
	return app({
		modules: [module({ ...canvasModule, provide })],
		host: canvasHost({ platform: "web", opened, ownsPaste }),
	});
}

function recordingStore(reasons: string[]): CanvasStore {
	const store = createCanvasStore({ app: "Farm", page: "Home", isLayersOpen: false, mode: "hand" }, () => undefined);
	return {
		now: () => store.now(),
		watch: (fields, changed) => store.watch(fields, changed),
		change: (next, reason) => {
			reasons.push(reason);
			store.change(next, reason);
		},
	};
}

function heldSource(): HeldSource {
	let release = (): void => undefined;
	const designed = new Promise<DrawnDesign>((done) => (release = () => done(DESIGN)));
	const watching = { started: 0, stopped: 0 };
	const photos: File[][] = [];
	const source: DesignSource = {
		design: () => designed,
		docs: async () => [],
		jobs: () => [],
		onJobs: () => () => undefined,
		liveJob: () => null,
		stopJob: refusedHere,
		drawing: (): never => {
			throw new Error("not in this check");
		},
		onChanged: () => {
			watching.started += 1;
			return () => void (watching.stopped += 1);
		},
		addPhotos: async (_app: string, added: readonly File[]) => void photos.push([...added]),
		moveLayer: refusedHere,
		returnToView: refusedHere,
		look: async () => null,
		pickLook: refusedHere,
		noteBoard: async () => null,
		pictureOf: null,
	};
	return { source, release: () => release(), watching, photos };
}
