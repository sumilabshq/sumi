import { createElement as h } from "react";
import type { ReactElement } from "react";
import { tooltipMarks } from "@widgetarium/kit";
import { MINUTE_MS, fullTimeSaidOf, timeAgoSaidOf } from "../../lib/said-time.js";
import { useTicking } from "../../lib/use-ticking.js";

export function SentTime({ at }: { readonly at: number }): ReactElement {
	useTicking(MINUTE_MS);
	return (
		<span className="wg-studio-ai-mine-time" {...tooltipMarks({ said: fullTimeSaidOf(at), side: "top" })}>
			{timeAgoSaidOf(at, Date.now())}
		</span>
	);
}
