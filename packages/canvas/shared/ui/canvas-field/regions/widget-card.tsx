import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { DrawingQuery } from "../../../../features/field/contract.js";
import type { WidgetCard as Card } from "../../../schema/regions.schema.js";
import { GpuScreen } from "../frames/gpu-screen.js";

const CARD_MIN_PX = 160;

export function WidgetCard({ card }: { readonly card: Card }): ReactElement {
	const { registry } = useQuery(DrawingQuery).data;
	return (
		<figure
			className="cv:m-0 cv:flex cv:flex-col cv:gap-2.5 cv:[contain:layout_paint]"
			style={{ width: card.width }}
			data-canvas-card=""
		>
			<figcaption className="cv:text-lg cv:font-semibold cv:text-muted-foreground" data-canvas-card-name="">
				{card.label}
			</figcaption>
			<GpuScreen
				id={card.frame}
				label={card.label}
				width={card.width}
				minHeight={CARD_MIN_PX}
				picture={card.picture}
				registry={registry}
			/>
		</figure>
	);
}
