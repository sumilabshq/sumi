import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import type { CommandPiece } from "../../lib/slash-matches.js";

export interface CommandHighlightProps {
	readonly pieces: readonly CommandPiece[];
	readonly mirror: RefObject<HTMLDivElement | null>;
}

export function CommandHighlight({ pieces, mirror }: CommandHighlightProps): ReactElement {
	return (
		<div ref={mirror} className="sumi-slash-mirror" aria-hidden={true}>
			{pieces.map(({ text, isCommand }, index) => (isCommand ? <mark key={index}>{text}</mark> : text))}
		</div>
	);
}
