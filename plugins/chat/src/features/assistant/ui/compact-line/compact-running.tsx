import { createElement as h } from "react";
import type { ReactElement } from "react";

const COMPACTING = "Compacting the conversation…";

export function CompactRunning(): ReactElement {
	return (
		<div className="wg-studio-ai-compact" role="status">
			<span className="wg-studio-ai-compact-said">
				<span className="wg-studio-ai-compact-spin" aria-hidden="true" />
				{COMPACTING}
			</span>
		</div>
	);
}
