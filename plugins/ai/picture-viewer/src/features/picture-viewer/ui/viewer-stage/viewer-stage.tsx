import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { ShownPicture } from "../../lib/shown-picture.js";

export interface ViewerStageProps {
	readonly shown: ShownPicture;
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
				<IconButton
					variant="overlay"
					size="s"
					className="wg-studio-ai-viewer-button"
					label={PREVIOUS}
					onClick={() => step(-1)}
				>
					<Icon name="chevron-left" size={18} />
				</IconButton>
			) : null}
			<div className="wg-studio-ai-viewer-frame" onClick={onClose}>
				<img src={shown.src} alt={shown.name} onClick={(event) => event.stopPropagation()} />
			</div>
			{count > 1 ? (
				<IconButton
					variant="overlay"
					size="s"
					className="wg-studio-ai-viewer-button"
					label={NEXT}
					onClick={() => step(1)}
				>
					<Icon name="chevron-right" size={18} />
				</IconButton>
			) : null}
		</div>
	);
}
