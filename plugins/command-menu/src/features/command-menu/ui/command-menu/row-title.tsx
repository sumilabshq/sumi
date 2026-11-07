import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Row } from "@sumi/command-menu";

export interface RowTitleProps {
	readonly title: string;
	readonly match: Row["match"];
}

export function RowTitle({ title, match }: RowTitleProps): ReactElement {
	const start = match?.start ?? title.length;
	const end = start + (match?.length ?? 0);
	return (
		<span className="wg-cm-title">
			{title.slice(0, start)}
			{start === end ? null : <span className="wg-cm-matched">{title.slice(start, end)}</span>}
			{title.slice(end)}
		</span>
	);
}
