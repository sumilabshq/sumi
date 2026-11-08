import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface ChangeNumsProps {
	readonly added: number;
	readonly removed: number;
	readonly hidesZero: boolean;
}

const ADDED = "+{count}";
const REMOVED = "−{count}";

export function ChangeNums({ added, removed, hidesZero }: ChangeNumsProps): ReactElement {
	return (
		<span className="wg-git-nums">
			{hidesZero && added === 0 ? null : <span className="wg-git-add">{ADDED.replace("{count}", String(added))} </span>}
			{hidesZero && removed === 0 ? null : <span className="wg-git-del">{REMOVED.replace("{count}", String(removed))}</span>}
		</span>
	);
}
