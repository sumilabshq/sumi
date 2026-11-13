import { useEffect, useState } from "react";
import { fillCutOf, groundCutOf, hasOpaqueGround } from "./mono-mask.js";

export interface MonoMask {
	readonly src: string;
	readonly mask: string | null;
	readonly isBroken: boolean;
}

const SIDE_PX = 64;

export function useMonoMask(src: string): MonoMask {
	const [drawn, setDrawn] = useState<MonoMask>({
		src,
		mask: null,
		isBroken: false,
	});

	useEffect(() => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () =>
			setDrawn({
				src,
				mask: maskOf(image) ?? src,
				isBroken: false,
			});
		image.onerror = () =>
			setDrawn({
				src,
				mask: null,
				isBroken: true,
			});
		image.src = src;
		return () => {
			image.onload = null;
			image.onerror = null;
		};
	}, [src]);

	return drawn.src === src
		? drawn
		: {
				src,
				mask: null,
				isBroken: false,
			};
}

function maskOf(image: HTMLImageElement): string | null {
	const canvas = document.createElement("canvas");
	canvas.width = SIDE_PX;
	canvas.height = SIDE_PX;
	const pen = canvas.getContext("2d");

	if (pen === null) {
		return null;
	}

	try {
		pen.drawImage(image, 0, 0, SIDE_PX, SIDE_PX);
		const read = pen.getImageData(0, 0, SIDE_PX, SIDE_PX);

		const cut = hasOpaqueGround(read.data, SIDE_PX) ? groundCutOf(read.data, SIDE_PX) : fillCutOf(read.data);

		if (cut === null) {
			return null;
		}

		pen.putImageData(new ImageData(new Uint8ClampedArray(cut), SIDE_PX, SIDE_PX), 0, 0);
		return canvas.toDataURL("image/png");
	} catch {
		return null;
	}
}
