import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Pressable } from "@widgetarium/kit";
import type { ShownPicture } from "../../lib/shown-picture.js";

export interface ViewerThumbsProps {
	readonly pictures: readonly ShownPicture[];
	readonly at: number;
	readonly onPick: (at: number) => void;
}

const SHOW = "Show {name}";

export function ViewerThumbs({ pictures, at, onPick }: ViewerThumbsProps): ReactElement {
	return (
		<div className="wg-studio-ai-viewer-thumbs">
			{pictures.map((picture, pictureAt) => (
				<Pressable
					key={pictureAt}
					className={pictureAt === at ? "wg-studio-ai-viewer-thumb is-shown" : "wg-studio-ai-viewer-thumb"}
					label={SHOW.replace("{name}", picture.name)}
					aria-current={pictureAt === at}
					onClick={() => onPick(pictureAt)}
				>
					<img src={picture.src} alt="" />
				</Pressable>
			))}
		</div>
	);
}
