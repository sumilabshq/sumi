import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface FrameNoteProps {
	readonly said: string;
}

export function FrameNote({ said }: FrameNoteProps): ReactElement {
	return <p className="wg-pane-note">{said}</p>;
}
