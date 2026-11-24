import { createElement as h } from "react";
import type { ReactElement } from "react";

export function LauncherHints(): ReactElement {
	return (
		<span className="sumi-launcher-hints">
			<span>
				<b>?</b>Ask
			</span>
			<span>
				<b>/</b>Commands
			</span>
		</span>
	);
}
