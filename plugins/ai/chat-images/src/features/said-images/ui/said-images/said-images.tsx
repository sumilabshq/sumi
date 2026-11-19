import { Fragment, createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { createPortal } from "react-dom";
import { useImageSpots } from "../../lib/use-image-spots.js";
import { SaidImage } from "../said-image/said-image.js";

export interface SaidImagesProps {
	readonly holder: RefObject<HTMLDivElement | null>;
}

export function SaidImages({ holder }: SaidImagesProps): ReactElement {
	const spots = useImageSpots(holder);
	return (
		<Fragment>
			{spots.map((spot, at) => createPortal(<SaidImage path={spot.path} alt={spot.alt} />, spot.element, String(at)))}
		</Fragment>
	);
}
