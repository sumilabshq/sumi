import type { RefObject } from "react";
import { useOverlayLayer } from "./use-overlay-layer";

export interface PortalContainer {
	readonly anchorRef: RefObject<HTMLSpanElement | null>;
	readonly container: HTMLElement | null;
}

export function usePortalContainer(): PortalContainer {
	const { anchorRef, layer } = useOverlayLayer(true);
	return { anchorRef, container: layer };
}
