import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { CanvasAppZone } from "../canvas-app-zone/canvas-app-zone.js";
import { CanvasField } from "../canvas-field/canvas-field.js";
import { CanvasLayout } from "../canvas-layout/canvas-layout.js";
import { CanvasTopBar } from "../canvas-top-bar/canvas-top-bar.js";
import { CanvasSidebar } from "../canvas-sidebar/canvas-sidebar.js";
import { JobStatus } from "../job-status/job-status.js";
import { LayersPanel } from "../layers-panel/layers-panel.js";
import { LookPanel } from "../look-panel/look-panel.js";
import { PagesList } from "../pages-list/pages-list.js";
import { ReturnButton } from "../return-button/return-button.js";

export interface CanvasProps {
	readonly header?: ReactNode;
	readonly isInPlate?: boolean;
}

export function Canvas({ header, isInPlate = false }: CanvasProps): ReactElement {
	return (
		<CanvasLayout
			header={header ?? <CanvasTopBar start={<CanvasAppZone />} end={<ReturnButton />} />}
			start={<CanvasSidebar top={<PagesList />} bottom={<LayersPanel />} />}
			end={<LookPanel />}
			bottom={<JobStatus />}
			isInPlate={isInPlate}
		>
			<CanvasField />
		</CanvasLayout>
	);
}
