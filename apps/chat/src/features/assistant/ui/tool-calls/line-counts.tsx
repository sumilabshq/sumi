import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface LineCountsProps {
	readonly added: number;
	readonly removed: number;
}

const ADDED = "+{count}";
const REMOVED = "−{count}";

export function LineCounts({ added, removed }: LineCountsProps): ReactElement {
	return (
		<span className="wg-studio-ai-call-meta is-counts">
			<span className="is-added">{ADDED.replace("{count}", String(added))}</span>{" "}
			<span className="is-removed">{REMOVED.replace("{count}", String(removed))}</span>
		</span>
	);
}
