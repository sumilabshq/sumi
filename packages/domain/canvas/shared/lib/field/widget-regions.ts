import type { DrawnWidget } from "../../schema/drawn-design.schema.js";
import type { Drawing } from "../../schema/drawing.schema.js";
import type { Region, WidgetCard } from "../../schema/regions.schema.js";
import { statePictureOf } from "../design/state-picture.js";
import { cardPxOf } from "./card-width.js";
import { frameIdOf } from "./frame-keys.js";

const WIDGETS = "Widgets";
const FROM_CATALOGUE = "From catalogue";
const NEW = "New";
const NO_STATES = "No states declared";

export function widgetsRegionOf(widgets: readonly DrawnWidget[], { registry }: Drawing): Region[] {
	if (widgets.length === 0) return [];
	const groups = widgets.map((widget) => {
		const definition = registry.get(widget.id);
		const title = definition?.manifest["title"];
		const width = cardPxOf(definition);
		const states = Object.entries(definition?.states ?? {});
		const cardOf = (label: string, props: Readonly<Record<string, unknown>>): WidgetCard => ({
			key: label,
			label,
			widget: widget.id,
			width,
			frame: frameIdOf(widget.id, label),
			picture: statePictureOf(registry, widget.id, props),
		});
		return {
			id: widget.id,
			title: typeof title === "string" ? title : widget.id,
			badge: widget.isFromCatalogue ? FROM_CATALOGUE : NEW,
			cards: states.length === 0 ? [cardOf(NO_STATES, {})] : states.map(([state, props]) => cardOf(state, props)),
		};
	});
	return [{ kind: "widgets", title: WIDGETS, count: groups.length, widgets: groups }];
}
