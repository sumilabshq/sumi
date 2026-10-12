import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PAGES } from "../../../schemas/canvas-page.schema.js";
import type { FrameSize } from "../../../schemas/frame-size.schema.js";
import type { Job } from "../../../schemas/job.schema.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

const DRAWING = "Being drawn";
const WAVE =
	"cv:bg-[linear-gradient(100deg,transparent_30%,color-mix(in_srgb,var(--wg-kit-text)_4%,transparent)_50%,transparent_70%)] cv:bg-[length:60%_100%] cv:bg-no-repeat cv:motion-safe:animate-canvas-wave";

export function PlannedPageRegion({ job, size }: { readonly job: Job; readonly size: FrameSize }): ReactElement {
	const page = job.page ?? job.title;
	return (
		<Region title={PAGES} count={1}>
			<Group title={page}>
				<div className="wg-design-frame cv:flex cv:flex-col cv:gap-3" style={{ width: size.width }}>
					<div className="cv:flex cv:min-h-9 cv:items-center cv:justify-between cv:gap-3">
						<span className="wg-design-name cv:text-lg cv:font-semibold cv:text-muted-foreground">{page}</span>
					</div>
					<div
						className={`cv:relative cv:box-border cv:flex cv:cursor-default cv:items-center cv:justify-center cv:bg-page cv:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)] ${WAVE}`}
						style={{ minHeight: size.height }}
						data-canvas-job-frame=""
					>
						<span className="cv:text-[19px] cv:text-muted-foreground">{DRAWING}</span>
					</div>
				</div>
			</Group>
		</Region>
	);
}
