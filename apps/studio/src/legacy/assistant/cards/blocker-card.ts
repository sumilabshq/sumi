import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Blocker } from "@widgetarium/core/engine/assistant-cards.js";

export interface BlockerCardProps {
	readonly blocker: Blocker;
	readonly onFix: () => void;
}

const BLOCKED_BY = "Blocked by";
const FIX_IT = "Fix it";

export function BlockerCard({ blocker, onFix }: BlockerCardProps): ReactElement {
	return h("div", { className: "wg-studio-ai-result-side" }, [
		h("span", { className: "wg-studio-ai-result-eyebrow", key: "eyebrow" }, BLOCKED_BY),
		h("span", { className: "wg-studio-ai-result-said", key: "said" }, blocker.feature),
		h("span", { className: "wg-studio-ai-result-why", key: "why" }, blocker.why),
		h("button", { className: "wg-studio-ai-pill is-l", key: "fix", type: "button", onClick: onFix }, FIX_IT),
	]);
}
