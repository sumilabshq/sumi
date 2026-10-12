import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { AddPhoto } from "../add-photo/add-photo.js";
import { AgentLookChip } from "../agent-look-chip/agent-look-chip.js";
import { CanvasField } from "../canvas-field/canvas-field.js";
import { CanvasLayout } from "../canvas-layout/canvas-layout.js";
import { CanvasTopBar } from "../canvas-top-bar/canvas-top-bar.js";
import { DesignSummary } from "../design-summary/design-summary.js";
import { JobStatus } from "../job-status/job-status.js";
import { LayersPanel } from "../layers-panel/layers-panel.js";
import { LayersToggle } from "../layers-toggle/layers-toggle.js";
import { LookPanel } from "../look-panel/look-panel.js";
import { ModeSwitch } from "../mode-switch/mode-switch.js";
import { PageTabs } from "../page-tabs/page-tabs.js";
import { PicturesProgress } from "../pictures-progress/pictures-progress.js";
import { RendererSwitch } from "../renderer-switch/renderer-switch.js";
import { VariantSwitch } from "../variant-switch/variant-switch.js";

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
