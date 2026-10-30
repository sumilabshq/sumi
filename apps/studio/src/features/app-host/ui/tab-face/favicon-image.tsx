import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { TabArtSize } from "./tab-art.js";

export interface FaviconImageProps {
	readonly src: string;
	readonly size: TabArtSize;
	readonly fallback: ReactElement;
}

const FAVICON_PX: Readonly<Record<TabArtSize, number>> = {
	row: 16,
	tile: 20,
};
const FAVICON_CLASS = "cv:mx-px cv:block cv:flex-none cv:rounded-(--sumi-r-xs) cv:object-contain";

export function FaviconImage({ src, size, fallback }: FaviconImageProps): ReactElement {
	const [failed, setFailed] = useState<string | null>(null);

	if (src === failed) {
		return fallback;
	}

	return (
		<img
			src={src}
			alt=""
			width={FAVICON_PX[size]}
			height={FAVICON_PX[size]}
			draggable={false}
			decoding="async"
			className={FAVICON_CLASS}
			style={{
				width: FAVICON_PX[size],
				height: FAVICON_PX[size],
			}}
			onError={() => setFailed(src)}
			data-host-tab-favicon=""
		/>
	);
}
