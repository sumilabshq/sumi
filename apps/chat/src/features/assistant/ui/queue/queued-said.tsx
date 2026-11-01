import { createElement as h, useState } from "react";
import type { ReactElement } from "react";

const LONG_AFTER_CHARS = 280;
const LONG_AFTER_LINES = 4;
const SHOW_MORE = "Show more";
const SHOW_LESS = "Show less";

export function QueuedSaid({ said }: { readonly said: string }): ReactElement {
	const [isExpanded, setExpanded] = useState(false);
	const isLong = said.length > LONG_AFTER_CHARS || said.split("\n").length > LONG_AFTER_LINES;
	return (
		<div className="wg-studio-ai-queued-said">
			<div className={isLong && !isExpanded ? "wg-studio-ai-queued-text is-clamped" : "wg-studio-ai-queued-text"}>{said}</div>
			{isLong ? (
				<button type="button" className="wg-studio-ai-queued-more" onClick={() => setExpanded(!isExpanded)}>
					{isExpanded ? SHOW_LESS : SHOW_MORE}
				</button>
			) : null}
		</div>
	);
}
