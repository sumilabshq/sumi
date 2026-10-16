import type { CanvasOpened, CanvasOpening } from "../../schema/canvas-view.schema.js";
import type { CanvasChange, CanvasField, CanvasMoment } from "./canvas-moment.js";
import { keepRenderer, keptRenderer } from "./kept-renderer.js";

export abstract class CanvasStore {
	abstract now(): CanvasMoment;
	abstract watch(fields: readonly CanvasField[], changed: () => void): () => void;
	abstract change(next: CanvasChange, reason: string): void;
	abstract unchanged(reason: string): void;
}

interface Watcher {
	readonly fields: readonly CanvasField[];
	readonly changed: () => void;
}

const QUIET_FIELDS: ReadonlySet<CanvasField> = new Set(["camera", "selection", "seenLayers", "closedLayers"]);
const KEPT_FIELDS: readonly CanvasField[] = ["page", "isLayersOpen", "mode"];

export class MomentCanvasStore extends CanvasStore {
	private readonly watchers = new Set<Watcher>();
	private moment: CanvasMoment;

	constructor(
		opened: CanvasOpened,
		private readonly keepOpening: (kept: CanvasOpening) => void,
	) {
		super();
		this.moment = momentOpened(opened);
	}

	override now(): CanvasMoment {
		return this.moment;
	}

	override watch(fields: readonly CanvasField[], changed: () => void): () => void {
		const watcher = { fields, changed };
		this.watchers.add(watcher);
		return () => void this.watchers.delete(watcher);
	}

	override change(asked: CanvasChange, reason: string): void {
		const next = withPageTurned(this.moment, asked);
		const changed = fieldsChanged(this.moment, next);
		if (changed.length === 0) return;
		const was = this.moment;
		this.moment = { ...this.moment, ...next };
		logged(was, this.moment, changed, reason);
		if (changed.includes("renderer")) keepRenderer(this.moment.renderer);
		if (changed.some((field) => KEPT_FIELDS.includes(field))) this.keepOpened();
		for (const watcher of [...this.watchers])
			if (watcher.fields.some((field) => changed.includes(field))) watcher.changed();
	}

	override unchanged(reason: string): void {
		toldCanvas(`unchanged (${reason})`);
	}

	private keepOpened(): void {
		const { page, isLayersOpen, mode } = this.moment;
		this.keepOpening({ page, isLayersOpen, mode });
	}
}

function momentOpened(opened: CanvasOpened): CanvasMoment {
	return {
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
	toldCanvas(`${from} → ${to} (${reason})`);
}

function toldCanvas(said: string): void {
	console.info(`[widgetarium] canvas ${said}`);
}
