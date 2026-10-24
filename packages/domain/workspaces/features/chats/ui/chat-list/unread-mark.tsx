import { createElement as h } from "react";
import type { ReactElement } from "react";

const UNREAD = "Done, not read yet";

export function UnreadMark(): ReactElement {
	return (
		<span className="wg-ws-mark">
			<span className="wg-ws-unread" role="img" aria-label={UNREAD} />
		</span>
	);
}
