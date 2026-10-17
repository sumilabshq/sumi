import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Tally } from "@widgetarium/core/engine/assistant-cards.js";
import { checksText } from "./checks-text.js";

const CHECKED = "Checked";

export function ChecksStrip({ checks }: { readonly checks: Tally }): ReactElement {
	return h("div", { className: "wg-studio-ai-result-side is-strip" }, [
		h("span", { className: "wg-studio-ai-result-eyebrow", key: "eyebrow" }, CHECKED),
		h("span", { className: "wg-studio-ai-result-said", key: "said" }, checksText(checks)),
	]);
}
