import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface GitNoteProps {
	readonly said: string;
}

export function GitNote({ said }: GitNoteProps): ReactElement {
	return <p className="wg-git-note">{said}</p>;
}
