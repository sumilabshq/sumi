import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface ClearedNoticeProps {
	readonly onUndo: () => void;
}

export function ClearedNotice({ onUndo }: ClearedNoticeProps): ReactElement {
	return (
		<div className="sumi-flows-label" role="status">
			<span>Inbox cleared</span>
			<button type="button" className="sumi-flows-label-action" onClick={onUndo}>
				Undo
			</button>
		</div>
	);
}
