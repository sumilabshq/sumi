import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useMonoMask } from "../../lib/tab-art/use-mono-mask.js";
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
const FAVICON_CLASS =
	"cv:mx-px cv:block cv:flex-none cv:bg-current cv:[mask-position:center] cv:[mask-repeat:no-repeat] cv:[mask-size:contain]";

export function FaviconImage({ src, size, fallback }: FaviconImageProps): ReactElement {
	const { mask, isBroken } = useMonoMask(src);

	if (isBroken) {
		return fallback;
	}

	return (
		<span
			aria-hidden="true"
			className={FAVICON_CLASS}
			style={{
				width: FAVICON_PX[size],
				height: FAVICON_PX[size],
				maskImage: mask === null ? undefined : `url("${mask}")`,
				WebkitMaskImage: mask === null ? undefined : `url("${mask}")`,
				visibility: mask === null ? "hidden" : undefined,
			}}
			data-host-tab-favicon=""
		/>
	);
}
