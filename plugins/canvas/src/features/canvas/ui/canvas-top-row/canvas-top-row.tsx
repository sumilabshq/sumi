import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { TopRow } from "../../../../shared/ui/top-row/top-row.js";
import { BackgroundAction } from "../background-action/background-action.js";
import { CanvasTitle } from "../canvas-title/canvas-title.js";
import { HomeLink } from "../home-link/home-link.js";
import { PanelToggle } from "../panel-toggle/panel-toggle.js";
import { ZoomMenu } from "../zoom-menu/zoom-menu.js";

export function CanvasTopRow(): ReactElement {
	return (
		<TopRow
			start={
				<Fragment>
					<HomeLink />
					<span className="sumi-canvas-crumb-slash" aria-hidden="true">
						/
					</span>
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
