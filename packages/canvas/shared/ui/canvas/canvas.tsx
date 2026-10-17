import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { CanvasAppZone } from "../canvas-app-zone/canvas-app-zone.js";
import { CanvasField } from "../../../features/field/ui/canvas-field/canvas-field.js";
import { CanvasLayout } from "../canvas-layout/canvas-layout.js";
import { CanvasTopBar } from "../canvas-top-bar/canvas-top-bar.js";
import { CanvasSidebar } from "../../../features/layers/ui/canvas-sidebar/canvas-sidebar.js";
import { JobStatus } from "../../../features/jobs/ui/job-status/job-status.js";
import { LayersPanel } from "../../../features/layers/ui/layers-panel/layers-panel.js";
import { LookPanel } from "../../../features/look/ui/look-panel/look-panel.js";
import { PagesList } from "../../../features/pages/ui/pages-list/pages-list.js";
import { ReturnButton } from "../../../features/pages/ui/return-button/return-button.js";

export interface CanvasProps {
	readonly header?: ReactNode;
}

export function Canvas({ header }: CanvasProps): ReactElement {
	return (
		<CanvasLayout
			header={header ?? <CanvasTopBar start={<CanvasAppZone />} end={<ReturnButton />} />}
			start={<CanvasSidebar top={<PagesList />} bottom={<LayersPanel />} />}
			end={<LookPanel />}
			bottom={<JobStatus />}
		>
			<CanvasField />
		</CanvasLayout>
	);
}
