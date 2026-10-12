import { createElement as h } from "react";
import type { ReactElement } from "react";
import { LOOK_PANEL, LOOK_SAID, LOOK_TITLE } from "./look-chrome.js";

const UNREADABLE = "The look cannot be read: {why}";

export function LookUnreadable({ why }: { readonly why: string }): ReactElement {
	return (
		<aside className={LOOK_PANEL} data-canvas-chrome="">
			<span className="cv:text-base cv:font-semibold">{LOOK_TITLE}</span>
			<span className={LOOK_SAID}>{UNREADABLE.replace("{why}", why)}</span>
		</aside>
	);
}
