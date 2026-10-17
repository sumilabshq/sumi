import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { AddPhoto } from "../../../features/photos/ui/add-photo/add-photo.js";
import { CanvasField } from "../../../features/field/ui/canvas-field/canvas-field.js";
import { CanvasLayout } from "../canvas-layout/canvas-layout.js";
import { CanvasTopBar } from "../canvas-top-bar/canvas-top-bar.js";
import { AppName } from "../../../features/pages/ui/app-name/app-name.js";
import { CanvasSidebar } from "../../../features/layers/ui/canvas-sidebar/canvas-sidebar.js";
import { JobStatus } from "../../../features/jobs/ui/job-status/job-status.js";
import { LayersPanel } from "../../../features/layers/ui/layers-panel/layers-panel.js";
import { LookPanel } from "../../../features/look/ui/look-panel/look-panel.js";
import { PageTabs } from "../../../features/pages/ui/page-tabs/page-tabs.js";
import { PagesList } from "../../../features/pages/ui/pages-list/pages-list.js";
import { SidebarToggle } from "../../../features/layers/ui/sidebar-toggle/sidebar-toggle.js";
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
							<SidebarToggle />
							<AppName />
							<AddPhoto />
							{/* TODO: bring the mode switch back */}
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
			start={<CanvasSidebar top={<PagesList />} bottom={<LayersPanel />} />}
			end={<LookPanel />}
			bottom={<JobStatus />}
		>
			<CanvasField />
		</CanvasLayout>
	);
}
