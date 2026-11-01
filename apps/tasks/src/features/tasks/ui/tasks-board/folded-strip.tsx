import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { BoardColumn, ClosedWithin } from "@widgetarium/tasks";
import { CLOSED_WITHIN_WORDS } from "../../lib/task-words.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";

export interface FoldedStripProps {
	readonly column: BoardColumn;
	readonly closedWithin: ClosedWithin;
	readonly unfold: () => void;
}

const UNFOLD = "Unfold {status}";

export function FoldedStrip({ column, closedWithin, unfold }: FoldedStripProps): ReactElement {
	return (
		<button
			type="button"
			className="wg-tasks-strip"
			data-tasks-strip={column.status}
			data-tasks-glide={`strip:${column.status}`}
			aria-label={UNFOLD.replace("{status}", column.label)}
			onClick={unfold}
		>
			<StatusGlyph status={column.status} />
			<span className="wg-tasks-strip-said">
				<b>{column.label}</b> {column.count}
				{column.isClosed ? ` · ${CLOSED_WITHIN_WORDS[closedWithin].toLowerCase()}` : ""}
			</span>
		</button>
	);
}
