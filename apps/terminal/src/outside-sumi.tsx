import { createElement as h } from "react";
import type { ReactElement } from "react";

const APP_NAME = "Terminal";
const OUTSIDE_SUMI = "Open this app inside Sumi";

export function OutsideSumi(): ReactElement {
	return (
		<main className="wg-terminal-app wg-app-body" aria-label={APP_NAME}>
			<p className="wg-terminal-note">{OUTSIDE_SUMI}</p>
		</main>
	);
}
