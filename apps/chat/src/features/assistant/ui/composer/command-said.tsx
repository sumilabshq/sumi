import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import type { SaidPiece } from "../../lib/slash-matches.js";

export interface CommandSaidProps {
	readonly pieces: readonly SaidPiece[];
	readonly mirror: RefObject<HTMLDivElement | null>;
}

export function CommandSaid({ pieces, mirror }: CommandSaidProps): ReactElement {
	return (
		<div ref={mirror} className="wg-studio-ai-box-mirror" aria-hidden={true}>
			{pieces.map(({ text, isCommand }, at) =>
				isCommand ? (
					<mark key={at} className="wg-studio-ai-command">
						{text}
					</mark>
				) : (
					text
				),
			)}
		</div>
	);
}
