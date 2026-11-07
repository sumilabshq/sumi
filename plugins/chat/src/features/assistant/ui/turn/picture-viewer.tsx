import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useStepsThroughPictures } from "../../lib/use-steps-through-pictures.js";
import { ViewerHead } from "./viewer-head.js";
import { ViewerStage } from "./viewer-stage.js";
import { ViewerThumbs } from "./viewer-thumbs.js";
import type { AttachmentChip } from "@widgetarium/assistant";

export interface PictureViewerProps {
	readonly pictures: readonly AttachmentChip[];
	readonly startAt: number;
	readonly host: HTMLElement;
	readonly onClose: () => void;
}

export function PictureViewer({ pictures, startAt, host, onClose }: PictureViewerProps): ReactElement {
	const count = pictures.length;
	const { at, layer, step, show, onKeyDown } = useStepsThroughPictures({
		count,
		startAt,
		onClose,
	});
	const shown = pictures[at] ?? pictures[0];

	if (!shown) {
		return <span hidden={true} />;
	}

	return createPortal(
		<div className="wg-portal wg-studio-ai-viewer-host">
			<div
				className="wg-studio-ai-viewer"
				ref={layer}
				role="dialog"
				aria-modal={true}
				aria-label={shown.name}
				tabIndex={-1}
				onKeyDown={onKeyDown}
				data-picture-viewer=""
			>
				<ViewerHead shown={shown} at={at} count={count} onClose={onClose} />
				<ViewerStage shown={shown} count={count} step={step} onClose={onClose} />
				{count > 1 ? <ViewerThumbs pictures={pictures} at={at} onPick={show} /> : null}
			</div>
		</div>,
		host,
	);
}
