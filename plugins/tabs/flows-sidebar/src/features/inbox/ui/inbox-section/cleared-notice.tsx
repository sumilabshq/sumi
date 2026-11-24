import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface ClearedNoticeProps {
	readonly failure: string | null;
	readonly onUndo: () => void;
}

export function ClearedNotice({ failure, onUndo }: ClearedNoticeProps): ReactElement {
	return (
		<div className="sumi-flows-label" role="status">
			<span>{failure ?? "Inbox cleared"}</span>
			<button type="button" className="sumi-flows-label-action" onClick={onUndo}>
				Undo
			</button>
		</div>
	);
}
