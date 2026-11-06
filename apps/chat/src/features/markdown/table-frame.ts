import { createCopyTool } from "./copy-tool.js";
import { createMoreToggle } from "./more-toggle.js";

const CUT_OVER_ROWS = 25;
const ROWS_WHEN_CUT = 12;
const MORE_ROWS = "Show {count} more rows";
const PAST_CUT_CLASS = "is-past-cut";

export function createTableFrame(page: Document, table: HTMLTableElement, source: string): Element {
	const wrap = page.createElement("div");
	wrap.className = "wg-studio-ai-table-wrap";
	const tools = wrap.appendChild(page.createElement("div"));
	tools.className = "wg-studio-ai-table-tools";
	tools.append(createCopyTool(page, source));
	const frame = wrap.appendChild(page.createElement("div"));
	frame.className = "wg-studio-ai-table";
	frame.append(table);
	appendRowCut(page, frame, [...(table.tBodies[0]?.rows ?? [])]);
	return wrap;
}

function appendRowCut(page: Document, frame: HTMLElement, rows: readonly HTMLTableRowElement[]): void {
	if (rows.length <= CUT_OVER_ROWS) {
		return;
	}

	for (const row of rows.slice(ROWS_WHEN_CUT)) {
		row.classList.add(PAST_CUT_CLASS);
	}

	frame.append(
		createMoreToggle(page, {
			target: frame,
			moreSaid: MORE_ROWS.replace("{count}", String(rows.length - ROWS_WHEN_CUT)),
		}),
	);
}
