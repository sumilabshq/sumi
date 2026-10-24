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
const MAKE_KEYS = "⇧↵";

export function RowEnd({ row, isPicked }: RowEndProps): ReactElement {
	if (isPicked) {
		return <RowEndKeys said={row.doLabel} keys={ENTER} />;
	}

	if (row.kind === "ask") {
		return <RowEndKeys said="" keys={ASK_KEYS} />;
	}

	if (row.isMakeNew) {
		return <RowEndKeys said="" keys={MAKE_KEYS} />;
	}

	return <RowEndKeys said={row.kindLabel} keys={row.shortcut} />;
}
