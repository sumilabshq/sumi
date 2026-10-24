import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Chevron } from "../../../../shared/ui/chevron/chevron.js";
import type { ChevronProps } from "../../../../shared/ui/chevron/chevron.js";

export function RoundChevron({ isOpen }: ChevronProps): ReactElement {
	return (
		<span className="wg-studio-ai-round" aria-hidden={true}>
			<Chevron isOpen={isOpen} />
		</span>
	);
}
