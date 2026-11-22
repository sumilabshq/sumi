import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Pressable } from "@widgetarium/kit";
import { RowIcon } from "@sumi/command-menu-plugin";
import type { Intent, Row } from "@sumi/command-menu/contract";

export interface ContinueRowsProps {
	readonly rows: readonly Row[];
	readonly run: (intent: Intent) => void;
}

const LABEL = "Continue";

export function ContinueRows({ rows, run }: ContinueRowsProps): ReactElement | null {
	if (rows.length === 0) {
		return null;
	}

	return (
		<section className="sumi-launcher-section" aria-label={LABEL}>
			<div className="sumi-launcher-label">{LABEL}</div>
			{rows.map((row) => (
				<Pressable
					key={row.key}
					className="wg-cm-row sumi-launcher-row"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => run(row.intent)}
				>
					<RowIcon icon={row.icon} />
					<span className="sumi-launcher-row-title">{row.title}</span>
					<span className="sumi-launcher-row-meta">{row.kindLabel}</span>
				</Pressable>
			))}
		</section>
	);
}
