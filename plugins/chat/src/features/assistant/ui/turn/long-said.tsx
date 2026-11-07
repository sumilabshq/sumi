import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { SCROLL_KEEP_ATTRIBUTE } from "@widgetarium/kit";

const SHOW_MORE = "Show more";
const SHOW_LESS = "Show less";
const KEPT_IN_PLACE = { [SCROLL_KEEP_ATTRIBUTE]: "" };

export function LongSaid({ text }: { readonly text: string }): ReactElement {
	const [isWhole, setWhole] = useState(false);
	return (
		<div className="wg-studio-ai-said" {...KEPT_IN_PLACE}>
			<div className={isWhole ? "wg-studio-ai-said-text" : "wg-studio-ai-said-text is-clamped"}>{text}</div>
			<button
				className="wg-studio-ai-more"
				type="button"
				onClick={() => setWhole(!isWhole)}
				{...(isWhole ? KEPT_IN_PLACE : {})}
			>
				{isWhole ? SHOW_LESS : SHOW_MORE}
			</button>
		</div>
	);
}
