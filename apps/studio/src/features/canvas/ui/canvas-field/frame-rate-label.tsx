import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import type { FrameRate } from "@widgetarium/gpu";

const LABEL =
	"cv:pointer-events-none cv:absolute cv:bottom-3.5 cv:left-4 cv:text-xs cv:text-muted-foreground cv:tabular-nums";

export function FrameRateLabel({ frameRate }: { readonly frameRate: FrameRate }): ReactElement | null {
	const perSecond = useSyncExternalStore(frameRate.watch, frameRate.perSecond);
	if (perSecond === null) {
		return null;
	}

	return (
		<span className={LABEL} data-canvas-fps="">
			{`${perSecond} FPS`}
		</span>
	);
}
