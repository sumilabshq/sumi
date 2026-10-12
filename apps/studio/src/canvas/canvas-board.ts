import type { Mounted } from "../legacy/band-board.js";
import { canvasField, canvasTopBar, jobStatus, layersPanel, lookPanel } from "@widgetarium/canvas";
import { PORT_IMPLEMENTATIONS } from "./canvas-ports.js";

export interface CanvasCorners {
	readonly start: readonly Mounted[];
	readonly end: readonly Mounted[];
}

interface Held {
	readonly widget: string;
	readonly props: Readonly<Record<string, unknown>>;
	readonly mounts?: Readonly<Record<string, readonly MountRow[]>>;
	readonly mounted?: Readonly<Record<string, Held>>;
}

interface MountRow {
	readonly name: string;
	readonly widget: string;
}

const FIELD_TILE = "canvas-field";
const DECLARED_PORTS: Readonly<Record<string, readonly string[]>> = {
	"@canvas/canvas-field": Object.keys(canvasField.metadata.props ?? {}),
	"@canvas/canvas-top-bar": Object.keys(canvasTopBar.metadata.props ?? {}),
	"@canvas/layers-panel": Object.keys(layersPanel.metadata.props ?? {}),
	"@canvas/look-panel": Object.keys(lookPanel.metadata.props ?? {}),
	"@canvas/job-status": Object.keys(jobStatus.metadata.props ?? {}),
};
const NO_CORNERS: CanvasCorners = { start: [], end: [] };

export function canvasBoardOf(corners: CanvasCorners = NO_CORNERS): Record<string, unknown> {
	const overlays = {
		top: { "Top bar": withCorners(boundTo("@canvas/canvas-top-bar"), corners) },
		start: { Layers: boundTo("@canvas/layers-panel") },
		end: { Look: boundTo("@canvas/look-panel") },
		status: { "Job status": boundTo("@canvas/job-status") },
	};
	const field = withMounts(boundTo("@canvas/canvas-field"), overlays);
	return {
		v: 2,
		tiles: [{ id: FIELD_TILE, ...field }],
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: FIELD_TILE, surface: "none" }] }] },
	};
}

function boundTo(widget: string): Held {
	const declared = DECLARED_PORTS[widget] ?? [];
	const props = Object.fromEntries(
		declared.flatMap((port) => {
			const implementation = PORT_IMPLEMENTATIONS[port];
			return implementation ? [[port, { implementation, fields: {} }]] : [];
		}),
	);
	return { widget, props };
}

function withCorners(held: Held, { start, end }: CanvasCorners): Held {
	const named = (items: readonly Mounted[]) =>
		Object.fromEntries(items.map(({ name, widget, props }) => [name, { widget, props }]));
	return withMounts(held, { start: named(start), end: named(end) });
}

function withMounts(held: Held, slots: Readonly<Record<string, Readonly<Record<string, Held>>>>): Held {
	const mounts = Object.fromEntries(
		Object.entries(slots).map(([slot, items]) => [
			slot,
			Object.entries(items).map(([name, item]) => ({ name, widget: item.widget })),
		]),
	);
	const mounted = Object.fromEntries(Object.values(slots).flatMap((items) => Object.entries(items)));
	return { ...held, mounts, mounted };
}
