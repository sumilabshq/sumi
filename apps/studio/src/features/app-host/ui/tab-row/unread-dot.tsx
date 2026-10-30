import { createElement as h } from "react";
import type { ReactElement } from "react";

const UNREAD = "Done, not read yet";
const DOT = "cv:ms-auto cv:size-2 cv:flex-none cv:rounded-full cv:bg-(--sumi-accent)";

export function UnreadDot(): ReactElement {
	return <span className={DOT} role="img" aria-label={UNREAD} data-tabs-unread="" />;
}
