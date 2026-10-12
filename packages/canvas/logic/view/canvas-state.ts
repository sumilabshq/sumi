import type { Camera } from "../../schemas/camera.schema.js";
import type { CanvasMode, PageRenderer, Variants } from "../../schemas/canvas-view.schema.js";
import type { FrameSize } from "../../schemas/frame-size.schema.js";
import type { Selection } from "../../schemas/selection.schema.js";
import { keepRenderer, keptRenderer } from "./kept-renderer.js";

export interface CanvasMoment {
	readonly page: string;
	readonly keptPage: string;
	readonly isLayersOpen: boolean;
	readonly mode: CanvasMode;
	readonly renderer: PageRenderer;
	readonly camera: Camera | null;
	readonly selection: Selection | null;
	readonly variants: Variants;
	readonly focusedWidget: string | null;
	readonly viewport: FrameSize | null;
}

export type CanvasField = keyof CanvasMoment;

export interface CanvasState {
	now(): CanvasMoment;
	watch(fields: readonly CanvasField[], changed: () => void): () => void;
	change(next: Partial<CanvasMoment>, reason: string): void;
}

export type CanvasOpening = Pick<CanvasMoment, "page" | "isLayersOpen" | "mode">;

const QUIET_FIELDS: ReadonlySet<CanvasField> = new Set(["camera", "viewport", "selection"]);

export function createCanvasState(opening: CanvasOpening): CanvasState {
	const watchers = new Set<{ readonly fields: readonly CanvasField[]; readonly changed: () => void }>();
	let moment: CanvasMoment = {
		...opening,
		keptPage: "",
		renderer: keptRenderer(),
		camera: null,
		selection: null,
		variants: {},
		focusedWidget: null,
		viewport: null,
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
			for (const watcher of [...watchers])
				if (watcher.fields.some((field) => changed.includes(field))) watcher.changed();
		},
	};
}

function withPageTurned(moment: CanvasMoment, asked: Partial<CanvasMoment>): Partial<CanvasMoment> {
	if (asked.page === undefined || asked.page === moment.page) return asked;
	const turned = { keptPage: asked.page, selection: null, camera: null, focusedWidget: null };
	return { ...turned, ...asked };
}

function fieldsChanged(moment: CanvasMoment, next: Partial<CanvasMoment>): CanvasField[] {
	return Object.keys(next)
		.filter((field): field is CanvasField => field in moment)
		.filter((field) => !Object.is(moment[field], next[field]));
}

function logged(was: CanvasMoment, now: CanvasMoment, changed: readonly CanvasField[], reason: string): void {
	const told = changed.filter((field) => !QUIET_FIELDS.has(field));
	if (told.length === 0) return;
	const from = JSON.stringify(Object.fromEntries(told.map((field) => [field, was[field]])));
	const to = JSON.stringify(Object.fromEntries(told.map((field) => [field, now[field]])));
	console.info(`[widgetarium] canvas ${from} → ${to} (${reason})`);
}
