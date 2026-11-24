import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { Intent, Row } from "@sumi/command-menu/contract";

export interface ContinueRowsProps {
	readonly rows: readonly Row[];
	readonly run: (intent: Intent) => void;
}

const LABEL = "Continue";
const MORE = "Show more";
const FIRST_SHOWN = 4;

export function ContinueRows({ rows, run }: ContinueRowsProps): ReactElement | null {
	const [isExpanded, setExpanded] = useState(false);

	if (rows.length === 0) {
		return null;
	}

	return (
		<section className="sumi-launcher-section" aria-label={LABEL}>
			<div className="sumi-launcher-label">{LABEL}</div>
			{(isExpanded ? rows : rows.slice(0, FIRST_SHOWN)).map((row) => (
				<button
					key={row.key}
					type="button"
					className="sumi-launcher-row"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => run(row.intent)}
				>
					<span className="sumi-launcher-row-title">{row.title}</span>
					{row.place === null ? null : <span className="sumi-launcher-row-place">{row.place}</span>}
					<span className="sumi-launcher-row-meta">{row.kindLabel}</span>
				</button>
			))}
			{isExpanded || rows.length <= FIRST_SHOWN ? null : (
				<button
					type="button"
					className="sumi-launcher-more"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => setExpanded(true)}
				>
					{MORE}
				</button>
			)}
		</section>
	);
}
