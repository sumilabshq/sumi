import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RegionOf } from "../../../schema/regions.js";
import { ScreenFrame } from "../frames/screen-frame.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

export function PagesRegion({ region }: { readonly region: RegionOf<"pages"> }): ReactElement {
	return (
		<Region title={region.title} count={region.count}>
			{region.screens.map((screen) => (
				<Group key={screen.name} title={screen.name} sub={screen.sub}>
					{screen.frames.map((frame) => (
						<ScreenFrame key={frame.key} frame={frame} />
					))}
				</Group>
			))}
		</Region>
	);
}
