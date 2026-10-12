import { z } from "zod";
import type { Layer } from "@widgetarium/behaviors";
import type { Drawing } from "../../schema/drawing.js";
import { LAYER_KINDS } from "../../schema/layer.js";

export interface LayerRow {
	readonly id: string;
	readonly title: string;
	readonly kind: Layer["kind"];
	readonly depth: number;
	readonly repeats: number;
	readonly isPicked: boolean;
	readonly isOpen: boolean;
	readonly isHeld: boolean;
	readonly canDrag: boolean;
	readonly canHold: boolean;
	readonly scope: string;
	readonly children: readonly LayerRow[];
}

export const LayerRowSchema: z.ZodType<LayerRow> = z.object({
	id: z.string(),
	title: z.string(),
	kind: z.enum(LAYER_KINDS),
	depth: z.number(),
	repeats: z.number(),
	isPicked: z.boolean(),
	isOpen: z.boolean(),
	isHeld: z.boolean(),
	canDrag: z.boolean(),
	canHold: z.boolean(),
	scope: z.string(),
	get children() {
		return z.array(LayerRowSchema).readonly();
	},
});

export interface RowsAsk {
	readonly registry: Drawing["registry"];
	readonly picked: string | null;
	readonly closed: ReadonlySet<string>;
	readonly isLocked: boolean;
}

const HOLDS_NOTHING: ReadonlySet<Layer["kind"]> = new Set(["widget", "input", "text", "picture"]);

export function layerRowsOf(layers: readonly Layer[], ask: RowsAsk, depth = 0): LayerRow[] {
	return layers.map((layer) => ({
		id: layer.mark,
		title: titleOf(layer, ask.registry),
		kind: layer.kind,
		depth,
		repeats: layer.repeats,
		isPicked: layer.mark === ask.picked,
		isOpen: !ask.closed.has(layer.mark),
		isHeld: layer.isHeld,
		canDrag: !layer.isHeld && (layer.kind === "widget" || !ask.isLocked),
		canHold: !HOLDS_NOTHING.has(layer.kind),
		scope: layer.scope,
		children: layerRowsOf(layer.children, ask, depth + 1),
	}));
}

function titleOf(layer: Layer, registry: Drawing["registry"]): string {
	const title = layer.widget ? registry.get(layer.widget)?.manifest["title"] : undefined;
	return typeof title === "string" && layer.name === layer.widget ? title : layer.name;
}
