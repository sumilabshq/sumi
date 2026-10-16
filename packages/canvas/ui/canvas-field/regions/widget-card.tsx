import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/mediator";
import { DrawingQuery } from "../../../requests/drawing.query.js";
import type { WidgetCard as Card } from "../../../schema/regions.schema.js";
import { DRAWS_AT_ONCE } from "../../../lib/state-drawing/draw-contexts.js";
import { StateDrawing } from "../../state-drawing/state-drawing.js";
import { DefaultDrawing } from "../frames/default-drawing.js";
import { DrawnWhenSeen } from "../frames/drawn-when-seen.js";

const CARD_UNSEEN_PX = 160;

export function WidgetCard({ card }: { readonly card: Card }): ReactElement {
	const { registry, host } = useQuery(DrawingQuery).data;
	return (
		<figure
			className="cv:m-0 cv:flex cv:flex-col cv:gap-2.5 cv:[contain:layout_paint]"
			style={{ width: card.width }}
			data-canvas-card=""
		>
			<figcaption className="cv:text-lg cv:font-semibold cv:text-muted-foreground" data-canvas-card-name="">
				{card.label}
			</figcaption>
			<div
				className="cv:relative cv:overflow-hidden cv:rounded-2xl cv:bg-page cv:p-5 cv:ring-1 cv:ring-edge cv:has-[.wg-kit-modal-layer]:min-h-[640px]"
				inert
				data-wg-overlay-root=""
			>
				<DRAWS_AT_ONCE.Provider value={true}>
					<DrawnWhenSeen minHeight={CARD_UNSEEN_PX} frame={card.frame} pictureKey={card.pictureKey}>
						{card.picture ? (
							<StateDrawing picture={card.picture} registry={registry} />
						) : (
							<DefaultDrawing id={card.widget} width={card.width} registry={registry} host={host} />
						)}
					</DrawnWhenSeen>
				</DRAWS_AT_ONCE.Provider>
			</div>
		</figure>
	);
}
