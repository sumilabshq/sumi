import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AttachmentChip } from "@widgetarium/assistant";

export interface ViewerThumbsProps {
	readonly pictures: readonly AttachmentChip[];
	readonly at: number;
	readonly onPick: (at: number) => void;
}

const SHOW = "Show {name}";

export function ViewerThumbs({ pictures, at, onPick }: ViewerThumbsProps): ReactElement {
	return (
		<div className="wg-studio-ai-viewer-thumbs">
			{pictures.map((picture, pictureAt) => (
				<button
					key={picture.id}
					type="button"
					className={pictureAt === at ? "wg-studio-ai-viewer-thumb is-shown" : "wg-studio-ai-viewer-thumb"}
					aria-label={SHOW.replace("{name}", picture.name)}
					aria-current={pictureAt === at}
					onClick={() => onPick(pictureAt)}
				>
					<img src={picture.preview ?? ""} alt="" />
				</button>
			))}
		</div>
	);
}
