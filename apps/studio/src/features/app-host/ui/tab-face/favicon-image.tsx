import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useMonoMask } from "../../lib/tab-art/use-mono-mask.js";
import type { TabArtSize } from "./tab-art.js";

export interface FaviconImageProps {
	readonly src: string;
	readonly size: TabArtSize;
	readonly fallback: ReactElement;
}

// TODO: favicon look as an appearance setting, mono or colour
const SHOWS_COLOUR_FAVICONS = true;
const FAVICON_PX: Readonly<Record<TabArtSize, number>> = {
	row: 16,
	tile: 20,
};
const FAVICON_CLASS =
	"cv:mx-px cv:block cv:flex-none cv:bg-current cv:[mask-position:center] cv:[mask-repeat:no-repeat] cv:[mask-size:contain]";
const TINTED_ICON_PREFIX = "data:image/svg+xml";
const TINTED_ICON_MARK = "currentColor";
const COLOUR_CLASS = "cv:mx-px cv:block cv:flex-none cv:object-contain";

function isTintedIcon(src: string): boolean {
	return src.startsWith(TINTED_ICON_PREFIX) && src.includes(TINTED_ICON_MARK);
}

export function FaviconImage(props: FaviconImageProps): ReactElement {
	if (isTintedIcon(props.src)) {
		return <TintedFavicon {...props} />;
	}

	if (SHOWS_COLOUR_FAVICONS) {
		return <ColourFavicon {...props} />;
	}

	return <MonoFavicon {...props} />;
}

function ColourFavicon({ src, size, fallback }: FaviconImageProps): ReactElement {
	const [isBroken, setBroken] = useState(false);

	if (isBroken) {
		return fallback;
	}

	return (
		<img
			src={src}
			alt=""
			aria-hidden="true"
			width={FAVICON_PX[size]}
			height={FAVICON_PX[size]}
			className={COLOUR_CLASS}
			onError={() => setBroken(true)}
			data-host-tab-favicon=""
		/>
	);
}

function MonoFavicon({ src, size, fallback }: FaviconImageProps): ReactElement {
	const { mask, isBroken } = useMonoMask(src);

	if (isBroken) {
		return fallback;
	}

	return <MaskedFavicon mask={mask} size={size} />;
}

function TintedFavicon({ src, size }: FaviconImageProps): ReactElement {
	return <MaskedFavicon mask={src} size={size} />;
}

function MaskedFavicon({ mask, size }: { readonly mask: string | null; readonly size: TabArtSize }): ReactElement {
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
