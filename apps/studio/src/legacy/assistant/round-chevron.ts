import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Chevron } from "./chevron.js";
import type { ChevronProps } from "./chevron.js";

export function RoundChevron({ isOpen }: ChevronProps): ReactElement {
	return h("span", { className: "wg-studio-ai-round", "aria-hidden": true }, h(Chevron, { isOpen }));
}
