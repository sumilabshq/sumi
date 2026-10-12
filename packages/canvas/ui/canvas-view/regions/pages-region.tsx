import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PAGES } from "../../../schemas/canvas-page.schema.js";
import { frameLabelOf } from "../../../schemas/design.schema.js";
import type { DrawnScreen } from "../../../schemas/design.schema.js";
import type { Drawing } from "../../../schemas/drawing.schema.js";
import type { FrameSize } from "../../../schemas/frame-size.schema.js";
import { ScreenFrame } from "../frames/screen-frame.js";
import { Group } from "./group.js";
import { NothingDrawn } from "./nothing-drawn.js";
import { Region } from "./region.js";

export interface PagesRegionProps extends Drawing {
	readonly screens: readonly DrawnScreen[];
	readonly size: FrameSize;
}

const STATES_SAID = "{count} states";

export function PagesRegion({ screens, size, registry, host }: PagesRegionProps): ReactElement {
	if (screens.length === 0) return <NothingDrawn />;
	return (
		<Region title={PAGES} count={screens.length}>
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
