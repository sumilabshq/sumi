import type { CanvasOpened, CanvasOpening } from "../../schema/canvas-view.js";
import type { CanvasChange, CanvasField, CanvasMoment } from "./canvas-moment.js";
import { keepRenderer, keptRenderer } from "./kept-renderer.js";

export abstract class CanvasStore {
	abstract now(): CanvasMoment;
	abstract watch(fields: readonly CanvasField[], changed: () => void): () => void;
	abstract change(next: CanvasChange, reason: string): void;
}

interface Watcher {
	readonly fields: readonly CanvasField[];
	readonly changed: () => void;
}

const QUIET_FIELDS: ReadonlySet<CanvasField> = new Set(["camera", "selection", "seenLayers", "closedLayers"]);
const KEPT_FIELDS: readonly CanvasField[] = ["page", "isLayersOpen", "mode"];

export function createCanvasStore(opened: CanvasOpened, keepOpening: (kept: CanvasOpening) => void): CanvasStore {
	const watchers = new Set<Watcher>();
	let moment: CanvasMoment = {
		...opened,
		keptPage: "",
		renderer: keptRenderer(),
		camera: null,
		selection: null,
		variants: {},
		focusedWidget: null,
		isLayoutLocked: true,
		closedLayers: [],
		seenLayers: {},
	};
	return {
		now: () => moment,
		watch: (fields, changed) => {
			const watcher = { fields, changed };
			watchers.add(watcher);
			return () => void watchers.delete(watcher);
		},
		change: (asked, reason) => {
			const next = withPageTurned(moment, asked);
			const changed = fieldsChanged(moment, next);
			if (changed.length === 0) return;
			const was = moment;
			moment = { ...moment, ...next };
			logged(was, moment, changed, reason);
			if (changed.includes("renderer")) keepRenderer(moment.renderer);
			if (changed.some((field) => KEPT_FIELDS.includes(field)))
				keepOpening({ page: moment.page, isLayersOpen: moment.isLayersOpen, mode: moment.mode });
			for (const watcher of [...watchers])
				if (watcher.fields.some((field) => changed.includes(field))) watcher.changed();
		},
	};
}

function withPageTurned(moment: CanvasMoment, asked: CanvasChange): CanvasChange {
	if (asked.page === undefined || asked.page === moment.page) return asked;
	const turned = { keptPage: asked.page, selection: null, camera: null, focusedWidget: null };
	return { ...turned, ...asked };
}

function fieldsChanged(moment: CanvasMoment, next: CanvasChange): CanvasField[] {
	return Object.keys(next)
		.filter((field): field is keyof CanvasChange => field !== "app" && field in moment)
		.filter((field) => !Object.is(moment[field], next[field]));
}

function logged(was: CanvasMoment, now: CanvasMoment, changed: readonly CanvasField[], reason: string): void {
	const told = changed.filter((field) => !QUIET_FIELDS.has(field));
	if (told.length === 0) return;
	const from = JSON.stringify(Object.fromEntries(told.map((field) => [field, was[field]])));
	const to = JSON.stringify(Object.fromEntries(told.map((field) => [field, now[field]])));
	console.info(`[widgetarium] canvas ${from} → ${to} (${reason})`);
}
