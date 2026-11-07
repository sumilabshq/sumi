import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface RowEndKeysProps {
	readonly said: string;
	readonly keys: string | null;
}

export function RowEndKeys({ said, keys }: RowEndKeysProps): ReactElement {
	return (
		<span className="wg-cm-end">
			{said === "" ? null : <span className="wg-cm-kind">{said}</span>}
			{keys === null ? null : <kbd className="wg-cm-kbd">{keys}</kbd>}
		</span>
	);
}
