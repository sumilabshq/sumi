import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { AddPhoto } from "../../../features/photos/ui/add-photo/add-photo.js";
import { AgentLookChip } from "../../../features/agent/ui/agent-look-chip/agent-look-chip.js";
import { CanvasField } from "../../../features/field/ui/canvas-field/canvas-field.js";
import { CanvasLayout } from "../canvas-layout/canvas-layout.js";
import { CanvasTopBar } from "../canvas-top-bar/canvas-top-bar.js";
import { DesignSummary } from "../../../features/pages/ui/design-summary/design-summary.js";
import { JobStatus } from "../../../features/jobs/ui/job-status/job-status.js";
import { LayersPanel } from "../../../features/layers/ui/layers-panel/layers-panel.js";
import { LayersToggle } from "../../../features/layers/ui/layers-toggle/layers-toggle.js";
import { LookPanel } from "../../../features/look/ui/look-panel/look-panel.js";
import { ModeSwitch } from "../../../features/view/ui/mode-switch/mode-switch.js";
import { PageTabs } from "../../../features/pages/ui/page-tabs/page-tabs.js";
import { PicturesProgress } from "../../../features/pictures/ui/pictures-progress/pictures-progress.js";
import { RendererSwitch } from "../../../features/view/ui/renderer-switch/renderer-switch.js";
import { VariantSwitch } from "../../../features/pages/ui/variant-switch/variant-switch.js";

export interface CanvasProps {
	readonly cornersStart?: ReactNode;
	readonly cornersEnd?: ReactNode;
}

export function Canvas({ cornersStart, cornersEnd }: CanvasProps): ReactElement {
	return (
		<CanvasLayout
			header={
				<CanvasTopBar
					cornersStart={cornersStart}
					start={
						<>
							<LayersToggle />
							<DesignSummary />
							<AddPhoto />
							<ModeSwitch />
							<PicturesProgress />
							<AgentLookChip />
							<RendererSwitch />
						</>
					}
					end={
						<>
							<VariantSwitch />
							<PageTabs />
						</>
					}
					cornersEnd={cornersEnd}
				/>
			}
			start={<LayersPanel />}
			end={<LookPanel />}
			bottom={<JobStatus />}
		>
			<CanvasField />
		</CanvasLayout>
	);
}
