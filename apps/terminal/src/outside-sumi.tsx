import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppPlate } from "./features/plate/ui/app-plate.js";

const APP_NAME = "Terminal";
const OUTSIDE_SUMI = "Open this app inside Sumi";

export function OutsideSumi(): ReactElement {
	return (
		<div className="wg-terminal-app">
			<AppPlate name={APP_NAME}>
				<p className="wg-terminal-note">{OUTSIDE_SUMI}</p>
			</AppPlate>
		</div>
	);
}
