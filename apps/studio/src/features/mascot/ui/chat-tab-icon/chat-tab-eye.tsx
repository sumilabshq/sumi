import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ChatTabStroke } from "../../lib/chat-tab-looks.js";

export function ChatTabEye({ d, width }: ChatTabStroke): ReactElement {
	return (
		<g className="wg-chat-tab-icon-lid">
			<path className="wg-chat-tab-icon-stroke" d={d} strokeWidth={width} />
		</g>
	);
}
