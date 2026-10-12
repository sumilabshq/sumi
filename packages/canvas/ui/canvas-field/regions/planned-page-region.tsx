import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RegionOf } from "../../../schema/regions.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

const DRAWING = "Being drawn";
const WAVE =
	"cv:bg-[linear-gradient(100deg,transparent_30%,color-mix(in_srgb,var(--wg-kit-text)_4%,transparent)_50%,transparent_70%)] cv:bg-[length:60%_100%] cv:bg-no-repeat cv:motion-safe:animate-canvas-wave";

export function PlannedPageRegion({ region }: { readonly region: RegionOf<"planned"> }): ReactElement {
	return (
		<Region title={region.title} count={1}>
			<Group title={region.page}>
				<div className="wg-design-frame cv:flex cv:flex-col cv:gap-3" style={{ width: region.width }}>
					<div className="cv:flex cv:min-h-9 cv:items-center cv:justify-between cv:gap-3">
						<span className="wg-design-name cv:text-lg cv:font-semibold cv:text-muted-foreground">{region.page}</span>
					</div>
					<div
						className={`cv:relative cv:box-border cv:flex cv:cursor-default cv:items-center cv:justify-center cv:bg-page cv:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)] ${WAVE}`}
						style={{ minHeight: region.height }}
						data-canvas-job-frame=""
					>
						<span className="cv:text-[19px] cv:text-muted-foreground">{DRAWING}</span>
					</div>
				</div>
			</Group>
		</Region>
	);
}
