import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RegionOf } from "../../../schema/regions.js";
import { Group } from "./group.js";
import { Region } from "./region.js";
import { WidgetCard } from "./widget-card.js";

export function WidgetsRegion({ region }: { readonly region: RegionOf<"widgets"> }): ReactElement {
	return (
		<Region title={region.title} count={region.count}>
			{region.widgets.map((widget) => (
				<Group key={widget.id} title={widget.title} sub={widget.id} badge={widget.badge} mark={widget.id}>
					{widget.cards.map((card) => (
						<WidgetCard key={card.key} card={card} />
					))}
				</Group>
			))}
		</Region>
	);
}
