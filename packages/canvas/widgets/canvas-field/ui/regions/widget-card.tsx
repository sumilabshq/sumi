import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing } from "../../../../schemas/drawing.schema.js";
import { cardPxOf } from "../../lib/card-width.js";
import { frameIdOf, snapshotKeyOf } from "../../lib/frame-keys.js";
import { DRAWS_AT_ONCE } from "../../../canvas-ui/draw-contexts.js";
import { DefaultDrawing } from "../frames/default-drawing.js";
import { DrawnWhenSeen } from "../frames/drawn-when-seen.js";
import { StateDrawing } from "../../../canvas-ui/frames/state-drawing.js";

export interface WidgetCardProps extends Drawing {
	readonly id: string;
	readonly label: string;
	readonly props?: Readonly<Record<string, unknown>> | undefined;
}

const CARD_UNSEEN_PX = 160;

export function WidgetCard({ id, label, props, registry, host }: WidgetCardProps): ReactElement {
	const cardPx = cardPxOf(registry.get(id));
	return (
		<figure
			className="cv:m-0 cv:flex cv:flex-col cv:gap-2.5 cv:[contain:layout_paint]"
			style={{ width: cardPx }}
			data-canvas-card=""
		>
			<figcaption className="cv:text-lg cv:font-semibold cv:text-muted-foreground" data-canvas-card-name="">
				{label}
			</figcaption>
			<div
				className="cv:relative cv:overflow-hidden cv:rounded-2xl cv:bg-page cv:p-5 cv:ring-1 cv:ring-edge cv:has-[.wg-kit-modal-layer]:min-h-[640px]"
				inert
				data-wg-overlay-root=""
			>
				<DRAWS_AT_ONCE.Provider value={true}>
					<DrawnWhenSeen
						minHeight={CARD_UNSEEN_PX}
						frame={frameIdOf(id, label)}
						pictureKey={snapshotKeyOf(registry, id, label, props ?? null)}
					>
						{props ? (
							<StateDrawing picture={{ widget: id, props }} registry={registry} />
						) : (
							<DefaultDrawing id={id} width={cardPx} registry={registry} host={host} />
						)}
					</DrawnWhenSeen>
				</DRAWS_AT_ONCE.Provider>
			</div>
		</figure>
	);
}
