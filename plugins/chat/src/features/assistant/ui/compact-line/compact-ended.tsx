import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface CompactEndedProps {
	readonly said: string;
}

export function CompactEnded({ said }: CompactEndedProps): ReactElement {
	return (
		<div className="wg-studio-ai-compact">
			<span className="wg-studio-ai-compact-said">
				<Icon name="fold-vertical" size={15} />
				{said}
			</span>
		</div>
	);
}
