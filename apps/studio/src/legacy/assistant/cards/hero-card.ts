import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface Headline {
	readonly first: string;
	readonly second: string;
}

export interface HeroCardProps {
	readonly chip: string;
	readonly headline: Headline;
}

export function HeroCard({ chip, headline }: HeroCardProps): ReactElement {
	return h("div", { className: "wg-studio-ai-result-hero" }, [
		h("span", { className: "wg-studio-ai-result-chip", key: "chip" }, chip),
		h("span", { className: "wg-studio-ai-result-big", key: "big" }, [
			h("span", { key: "first" }, headline.first),
			h("span", { key: "second" }, headline.second),
		]),
	]);
}
