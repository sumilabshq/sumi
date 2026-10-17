import type { CanvasMode, CanvasOpened, CanvasOpening } from "../../schema/canvas-view.schema.js";
import type { CanvasChange, CanvasField, CanvasMoment, MomentChange, OpeningChange } from "./canvas-moment.js";

export type KeepOpening = (kept: CanvasOpening) => void;

export abstract class CanvasStore {
	abstract now(): CanvasMoment;
	abstract watch(fields: readonly CanvasField[], changed: () => void): () => void;
	abstract change(next: CanvasChange, reason: string): boolean;
	abstract changeOpening(next: OpeningChange, reason: string): boolean;
	abstract unchanged(reason: string): void;
}

interface Watcher {
	readonly fields: readonly CanvasField[];
	readonly changed: () => void;
}

const QUIET_FIELDS: ReadonlySet<CanvasField> = new Set(["camera", "selection", "seenLayers", "closedLayers"]);
// TODO: open in the kept mode once the switch is back
const MODE_WHILE_SWITCH_HIDDEN: CanvasMode = "hand";
const OPENING_KEYS = ["page", "isLayersOpen", "mode"] as const satisfies readonly (keyof CanvasOpening)[];

export class MomentCanvasStore extends CanvasStore {
	private readonly watchers = new Set<Watcher>();
	private moment: CanvasMoment;

	constructor(
		opened: CanvasOpened,
		private readonly keepOpening: KeepOpening,
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

	override change(next: CanvasChange, reason: string): boolean {
		return this.write(next, reason);
	}

	override changeOpening({ page, ...rest }: OpeningChange, reason: string): boolean {
		const was = openingOf(this.moment);
		const turned = page === undefined ? rest : { ...pageTurnedTo(this.moment, page), ...rest };
		if (!this.write(turned, reason)) {
			return false;
		}

		const opening = openingOf(this.moment);
		if (OPENING_KEYS.some((key) => was[key] !== opening[key])) {
			this.keepOpening(opening);
		}

		return true;
	}

	override unchanged(reason: string): void {
		toldCanvas(`unchanged (${reason})`);
	}

	private write(next: MomentChange, reason: string): boolean {
		const changed = fieldsChanged(this.moment, next);
		if (changed.length === 0) {
			return false;
		}

		const was = this.moment;
		this.moment = { ...this.moment, ...next };
		logged(was, this.moment, changed, reason);
		for (const watcher of [...this.watchers]) {
			if (watcher.fields.some((field) => changed.includes(field))) {
				watcher.changed();
			}
		}

		return true;
	}
}

function momentOpened(opened: CanvasOpened): CanvasMoment {
	return {
		...opened,
		mode: MODE_WHILE_SWITCH_HIDDEN,
		keptPage: "",
		camera: null,
		selection: null,
		variants: {},
		focusedWidget: null,
		isLayoutLocked: true,
		closedLayers: [],
		seenLayers: {},
	};
}

function pageTurnedTo(moment: CanvasMoment, page: string): MomentChange {
	if (page === moment.page) {
		return { page };
	}

	return { page, keptPage: page, selection: null, camera: null, focusedWidget: null };
}

function openingOf({ page, isLayersOpen, mode }: CanvasMoment): CanvasOpening {
	return { page, isLayersOpen, mode };
}

function fieldsChanged(moment: CanvasMoment, next: MomentChange): CanvasField[] {
	return Object.keys(next)
		.filter((field): field is keyof MomentChange => field !== "app" && field in moment)
		.filter((field) => !Object.is(moment[field], next[field]));
}

function logged(was: CanvasMoment, now: CanvasMoment, changed: readonly CanvasField[], reason: string): void {
	const told = changed.filter((field) => !QUIET_FIELDS.has(field));
	if (told.length === 0) {
		return;
	}

	const from = JSON.stringify(Object.fromEntries(told.map((field) => [field, was[field]])));
	const to = JSON.stringify(Object.fromEntries(told.map((field) => [field, now[field]])));
	toldCanvas(`${from} → ${to} (${reason})`);
}

function toldCanvas(said: string): void {
	console.info(`[widgetarium] canvas ${said}`);
}
