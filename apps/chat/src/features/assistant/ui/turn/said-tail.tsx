import { createElement as h } from "react";
import type { ReactElement } from "react";
import { LiveCode } from "./live-code.js";

const FENCE = "```";

export function SaidTail({ tail }: { readonly tail: string }): ReactElement {
	if (tail.startsWith(FENCE)) {
		return <LiveCode tail={tail} />;
	}

	return <div className="wg-studio-ai-tail">{tail}</div>;
}
