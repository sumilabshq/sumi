import type { Camera } from "../../schema/camera.schema.js";
import { CanvasFieldSchema } from "../../schema/canvas-moment.schema.js";
import type { CanvasField } from "../../schema/canvas-moment.schema.js";
import type { CanvasMode, CanvasOpened, CanvasOpening, Variants } from "../../schema/canvas-view.schema.js";
import type { CanvasLayer } from "../../schema/layer.schema.js";
import type { Selection } from "../../schema/selection.schema.js";

export interface CanvasMoment {
	readonly app: string;
	readonly page: string;
	readonly keptPage: string;
	readonly isLayersOpen: boolean;
	readonly mode: CanvasMode;
	readonly camera: Camera | null;
	readonly selection: Selection | null;
	readonly variants: Variants;
	readonly focusedWidget: string | null;
	readonly isLayoutLocked: boolean;
	readonly closedLayers: readonly string[];
	readonly seenLayers: Readonly<Record<string, readonly CanvasLayer[]>>;
}

export type MomentChange = Partial<CanvasMoment>;

export interface MomentWrite {
	readonly moment: CanvasMoment;
	readonly fields: readonly CanvasField[];
	readonly said: string | null;
}

const QUIET_FIELDS: ReadonlySet<CanvasField> = new Set(["camera", "selection", "seenLayers", "closedLayers"]);
// TODO: open in the kept mode once the switch is back
const MODE_WHILE_SWITCH_HIDDEN: CanvasMode = "hand";

export const OPENING_FIELDS: readonly CanvasField[] = ["page", "isLayersOpen", "mode"];

export function momentOpened(opened: CanvasOpened): CanvasMoment {
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

export function pageTurnedTo(moment: CanvasMoment, page: string): MomentChange {
	if (page === moment.page) {
		return { page };
	}

	return {
		page,
		keptPage: page,
		selection: null,
		camera: null,
		focusedWidget: null,
	};
}

export function openingOf({ page, isLayersOpen, mode }: CanvasMoment): CanvasOpening {
	return {
		page,
		isLayersOpen,
		mode,
	};
}

export function momentWriteOf(was: CanvasMoment, change: MomentChange, reason: string): MomentWrite | null {
	const moment = {
		...was,
		...change,
	};
	const fields = fieldsChanged(was, moment);

	if (fields.length === 0) {
		return null;
	}

	return {
		moment,
		fields,
		said: transitionOf(was, moment, fields, reason),
	};
}

export function isTouching(fields: readonly CanvasField[], read: readonly CanvasField[]): boolean {
	return fields.some((field) => read.includes(field));
}

function transitionOf(
	was: CanvasMoment,
	moment: CanvasMoment,
	fields: readonly CanvasField[],
	reason: string,
): string | null {
	const told = fields.filter((field) => !QUIET_FIELDS.has(field));

	if (told.length === 0) {
		return null;
	}

	const from = JSON.stringify(Object.fromEntries(told.map((field) => [field, was[field]])));
	const to = JSON.stringify(Object.fromEntries(told.map((field) => [field, moment[field]])));
	return `canvas ${from} → ${to} (${reason})`;
}

function fieldsChanged(was: CanvasMoment, now: CanvasMoment): CanvasField[] {
	return CanvasFieldSchema.options.filter((field) => !Object.is(was[field], now[field]));
}
