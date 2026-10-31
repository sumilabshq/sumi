import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Row } from "@widgetarium/command-menu";
import { RowEndKeys } from "./row-end-keys.js";

export interface RowEndProps {
	readonly row: Row;
	readonly isPicked: boolean;
}

const ENTER = "↵";
const ASK_KEYS = "⌘↵";
const FALLBACK_KEYS = "⇧↵";

export function RowEnd({ row, isPicked }: RowEndProps): ReactElement {
	if (isPicked) {
		return <RowEndKeys said={row.kindLabel} keys={ENTER} />;
	}

	if (row.kind === "ask") {
		return <RowEndKeys said="" keys={row.shortcut ?? ASK_KEYS} />;
	}

	if (row.isFallback) {
		return <RowEndKeys said="" keys={FALLBACK_KEYS} />;
	}

	return <RowEndKeys said={row.kindLabel} keys={row.shortcut} />;
}
