import { createElement as h } from "react";
import type { ReactElement } from "react";
import { LOOK_PANEL, LOOK_SAID, LOOK_TITLE } from "./look-chrome.js";

export function LookUnreadable({ said }: { readonly said: string }): ReactElement {
	return (
		<aside className={LOOK_PANEL} data-canvas-chrome="">
			<span className="cv:text-base cv:font-semibold">{LOOK_TITLE}</span>
			<span className={LOOK_SAID}>{said}</span>
		</aside>
	);
}
