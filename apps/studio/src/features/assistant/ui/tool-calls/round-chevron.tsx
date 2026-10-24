import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Chevron } from "../chevron/chevron.js";
import type { ChevronProps } from "../chevron/chevron.js";

export function RoundChevron({ isOpen }: ChevronProps): ReactElement {
	return (
		<span className="wg-studio-ai-round" aria-hidden={true}>
			<Chevron isOpen={isOpen} />
		</span>
	);
}
