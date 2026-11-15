import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface RowEndProps {
	readonly shortcut: string | null;
	readonly isPicked: boolean;
}

const ENTER = "↵";

export function RowEnd({ shortcut, isPicked }: RowEndProps): ReactElement | null {
	const keys = shortcut ?? (isPicked ? ENTER : null);

	if (keys === null) {
		return null;
	}

	return <span className="wg-cm-end">{keys}</span>;
}
