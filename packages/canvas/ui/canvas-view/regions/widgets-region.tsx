import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DrawnWidget } from "../../../schemas/design.schema.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";
import { Group } from "./group.js";
import { Region } from "./region.js";
import { WidgetCard } from "./widget-card.js";

export interface WidgetsRegionProps extends Drawing {
	readonly widgets: readonly DrawnWidget[];
}

const WIDGETS = "Widgets";
const FROM_CATALOGUE = "From catalogue";
const NEW = "New";
const NO_STATES = "No states declared";

export function WidgetsRegion({ widgets, registry, host }: WidgetsRegionProps): ReactElement | null {
	if (widgets.length === 0) return null;
	return (
		<Region title={WIDGETS} count={widgets.length}>
			{widgets.map((widget) => {
				const definition = registry.get(widget.id);
				const title = definition?.manifest["title"];
				const states = Object.entries(definition?.states ?? {});
				return (
					<Group
						key={widget.id}
						title={typeof title === "string" ? title : widget.id}
						sub={widget.id}
						badge={widget.isFromCatalogue ? FROM_CATALOGUE : NEW}
						mark={widget.id}
					>
						{states.length === 0 ? (
							<WidgetCard id={widget.id} label={NO_STATES} registry={registry} host={host} />
						) : (
							states.map(([state, props]) => (
								<WidgetCard key={state} id={widget.id} label={state} props={props} registry={registry} host={host} />
							))
						)}
					</Group>
				);
			})}
		</Region>
	);
}
