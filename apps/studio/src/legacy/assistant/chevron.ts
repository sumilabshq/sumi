import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface ChevronProps {
	readonly isOpen: boolean;
}

export function Chevron({ isOpen }: ChevronProps): ReactElement {
	return h(Icon, {
		name: "chevron",
		size: 12,
		className: isOpen ? "wg-studio-ai-chevron is-open" : "wg-studio-ai-chevron",
	});
}
