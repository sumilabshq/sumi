import { Fragment, createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { createPortal } from "react-dom";
import { useBentoGalleries } from "../../lib/use-bento-galleries.js";
import { useImageSpots } from "../../lib/use-image-spots.js";
import { SaidImage } from "../said-image/said-image.js";

export interface SaidImagesProps {
	readonly holder: RefObject<HTMLDivElement | null>;
}

export function SaidImages({ holder }: SaidImagesProps): ReactElement {
	const spots = useImageSpots(holder);
	useBentoGalleries(holder);
	return (
		<Fragment>
			{spots.map((spot, at) =>
				createPortal(<SaidImage path={spot.path} alt={spot.alt} caption={spot.caption} />, spot.element, String(at)),
			)}
		</Fragment>
	);
}
