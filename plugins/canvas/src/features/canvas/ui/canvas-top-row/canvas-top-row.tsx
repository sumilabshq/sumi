import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { TrailButtons } from "@sumi/flows-sidebar-plugin";
import { TopRow } from "../../../../shared/ui/top-row/top-row.js";
import { BackgroundAction } from "../background-action/background-action.js";
import { CanvasTitle } from "../canvas-title/canvas-title.js";
import { PanelToggle } from "../panel-toggle/panel-toggle.js";
import { ZoomMenu } from "../zoom-menu/zoom-menu.js";

export function CanvasTopRow(): ReactElement {
	return (
		<TopRow
			start={
				<Fragment>
					<TrailButtons />
					<CanvasTitle />
				</Fragment>
			}
			end={
				<Fragment>
					<BackgroundAction />
					<ZoomMenu />
					<PanelToggle />
				</Fragment>
			}
		/>
	);
}
