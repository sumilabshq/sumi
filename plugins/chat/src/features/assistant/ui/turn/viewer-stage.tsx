import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "@widgetarium/assistant";

export interface ViewerStageProps {
	readonly shown: AttachmentChip;
	readonly count: number;
	readonly step: (by: number) => void;
	readonly onClose: () => void;
}

const PREVIOUS = "Previous picture";
const NEXT = "Next picture";

export function ViewerStage({ shown, count, step, onClose }: ViewerStageProps): ReactElement {
	return (
		<div className="wg-studio-ai-viewer-stage">
			{count > 1 ? (
				<button type="button" className="wg-studio-ai-viewer-button" aria-label={PREVIOUS} onClick={() => step(-1)}>
					<Icon name="chevron-left" size={18} />
				</button>
			) : null}
			<div className="wg-studio-ai-viewer-frame" onClick={onClose}>
				<img src={shown.preview ?? ""} alt={shown.name} onClick={(event) => event.stopPropagation()} />
			</div>
			{count > 1 ? (
				<button type="button" className="wg-studio-ai-viewer-button" aria-label={NEXT} onClick={() => step(1)}>
					<Icon name="chevron-right" size={18} />
				</button>
			) : null}
		</div>
	);
}
