import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@widgetarium/kit";
import { PAGES } from "../../../schemas/canvas-page.schema.js";
import type { DrawnScreen } from "../../../schemas/design.schema.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";
import type { FrameSize } from "../../../schemas/frame-size.schema.js";
import { frameLabelOf } from "../../frame-label/frame-label.js";
import { ScreenFrame } from "../frames/screen-frame.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

export interface PagesRegionProps extends Drawing {
	readonly screens: readonly DrawnScreen[];
	readonly size: FrameSize;
	readonly aside?: ReactNode;
}

const STATES_SAID = "{count} states";
const NOTHING_DRAWN = "No pages drawn yet";
const DRAWN_WHEN =
	"The assistant draws every page here at the design step, after Build it is pressed on the spec card. Ask in the chat to start.";

export function PagesRegion({ screens, size, aside, registry, host }: PagesRegionProps): ReactElement {
	if (screens.length === 0)
		return (
			<Region title={PAGES} count={0} aside={aside}>
				<Empty>
					<EmptyHeader>
						<EmptyTitle>{NOTHING_DRAWN}</EmptyTitle>
						<EmptyDescription>{DRAWN_WHEN}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</Region>
		);
	return (
		<Region title={PAGES} count={screens.length} aside={aside}>
			{screens.map((screen) => (
				<Group key={screen.name} title={screen.name} sub={STATES_SAID.replace("{count}", String(screen.states.length))}>
					{screen.states.map((state) => (
						<ScreenFrame
							key={state.name}
							label={frameLabelOf(screen, state.name)}
							state={state}
							size={size}
							registry={registry}
							host={host}
						/>
					))}
				</Group>
			))}
		</Region>
	);
}
