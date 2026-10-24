import { createElement as h } from "react";
import type { ReactElement } from "react";

export function EmojiGlyph({ emoji }: { readonly emoji: string }): ReactElement {
	return (
		<span className="wg-ws-emoji" aria-hidden="true">
			{emoji}
		</span>
	);
}
