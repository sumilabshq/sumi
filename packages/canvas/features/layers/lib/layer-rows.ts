import type { Layer } from "@widgetarium/behaviors";
import type { Drawing } from "../../../shared/schema/drawing.schema.js";
import type { LayerRow } from "../../../shared/schema/layer-row.schema.js";

interface RowsAsk {
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
