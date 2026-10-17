import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface LineCountsProps {
	readonly added: number;
	readonly removed: number;
}

const ADDED = "+{count}";
const REMOVED = "−{count}";

export function LineCounts({ added, removed }: LineCountsProps): ReactElement {
	return h("span", { className: "wg-studio-ai-call-meta is-counts" }, [
		h("span", { className: "is-added", key: "added" }, ADDED.replace("{count}", String(added))),
		" ",
		h("span", { className: "is-removed", key: "removed" }, REMOVED.replace("{count}", String(removed))),
	]);
}
