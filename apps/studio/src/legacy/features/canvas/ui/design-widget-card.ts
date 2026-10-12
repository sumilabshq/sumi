import { createElement as h } from "react";
import type { ReactElement } from "react";
import { StateDrawing } from "./state-drawing.js";
import { cardPxOf } from "../local/card-width.js";
import type { Drawing } from "../local/design-canvas-shapes.js";
import { DefaultDrawing } from "./design-default-drawing.js";
import { DRAWS_AT_ONCE, DrawnWhenSeen } from "./design-drawn-when-seen.js";
import { frameIdOf, snapshotKeyOf } from "../local/design-snapshots.js";

export interface WidgetCardProps extends Drawing {
	readonly id: string;
	readonly label: string;
	readonly props?: Readonly<Record<string, unknown>> | undefined;
}

const CARD_UNSEEN_PX = 160;

export function WidgetCard({ id, label, props, registry, host }: WidgetCardProps): ReactElement {
	const cardPx = cardPxOf(registry.get(id));
	return h("figure", { className: "wg-design-widget", style: { width: `${cardPx}px` } }, [
		h("figcaption", { key: "name", className: "wg-design-state-name" }, label),
		h(
			"div",
			{ key: "drawn", className: "wg-design-widget-body", inert: true, "data-wg-overlay-root": "" },
			h(
				DRAWS_AT_ONCE.Provider,
				{ value: true },
				h(
					DrawnWhenSeen,
					{
						minHeight: CARD_UNSEEN_PX,
						frame: frameIdOf(id, label),
						pictureKey: snapshotKeyOf(registry, id, label, props ?? null),
					},
					props
						? h(StateDrawing, { picture: { widget: id, props }, registry })
						: h(DefaultDrawing, { id, width: cardPx, registry, host }),
				),
			),
		),
	]);
}
