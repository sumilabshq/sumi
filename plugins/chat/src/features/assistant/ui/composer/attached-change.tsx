import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface Attached {
	readonly label: string;
	readonly onClear: () => void;
}

const STOP_CHANGING = "Stop changing it";

export function AttachedChip({ attached }: { readonly attached: Attached }): ReactElement {
	return (
		<span className="wg-studio-ai-target is-attached">
			<Icon name="pencil" size={14} />
			<span className="wg-studio-ai-target-name">{attached.label}</span>
			<button
				type="button"
				className="wg-studio-ai-attached-clear"
				aria-label={STOP_CHANGING}
				onClick={attached.onClear}
			>
				<Icon name="x" size={12} />
			</button>
		</span>
	);
}
