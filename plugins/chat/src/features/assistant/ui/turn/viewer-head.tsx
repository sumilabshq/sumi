import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "@widgetarium/assistant";

export interface ViewerHeadProps {
	readonly shown: AttachmentChip;
	readonly at: number;
	readonly count: number;
	readonly onClose: () => void;
}

const CLOSE = "Close the preview";
const COUNTER = "{at} / {count}";

export function ViewerHead({ shown, at, count, onClose }: ViewerHeadProps): ReactElement {
	return (
		<div className="wg-studio-ai-viewer-head">
			<span className="wg-studio-ai-viewer-name">{shown.name}</span>
			<span className="wg-studio-ai-viewer-faint">{shown.size}</span>
			<span className="wg-studio-ai-viewer-fill" />
			{count > 1 ? (
				<span className="wg-studio-ai-viewer-faint">
					{COUNTER.replace("{at}", String(at + 1)).replace("{count}", String(count))}
				</span>
			) : null}
			<button type="button" className="wg-studio-ai-viewer-button" aria-label={CLOSE} onClick={onClose}>
				<Icon name="x" size={16} />
			</button>
		</div>
	);
}
