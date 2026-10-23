import { createElement as h, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useHoldsTooltip } from "../hooks/use-holds-tooltip";
import { useLaysTooltip } from "../hooks/use-lays-tooltip";
import { portalLayer } from "../utils/portal-layer";
import { tooltipPointingOf } from "../utils/tooltip-pointing";
import { TooltipWords } from "./tooltip-words";

export function TooltipHost(): ReactElement | null {
	const [pointing] = useState(() => tooltipPointingOf(document));
	const [drawer] = useState(() => Symbol("tooltip host"));
	useHoldsTooltip(pointing, drawer);
	const state = useSyncExternalStore(pointing.subscribe, pointing.now);
	const isDrawn = useSyncExternalStore(pointing.subscribe, () => pointing.isDrawnBy(drawer));
	const bubble = useRef<HTMLDivElement | null>(null);
	const face = useRef<HTMLSpanElement | null>(null);
	const arrow = useRef<HTMLSpanElement | null>(null);
	useLaysTooltip({ bubble, face, arrow }, state, isDrawn);
	if (!isDrawn) {
		return null;
	}

	return createPortal(
		<div
			ref={bubble}
			className="wg-kit-tooltip-host"
			role="tooltip"
			data-tip-bubble=""
			data-phase={state.phase}
			data-fresh={state.isFresh ? "" : undefined}
		>
			<span
				ref={face}
				className={state.said?.keys ? "wg-kit-tooltip is-hosted has-keys" : "wg-kit-tooltip is-hosted"}
				data-tip-face=""
			>
				{state.previous === null ? null : <TooltipWords key={`was ${state.serial}`} said={state.previous} isLeaving />}
				{state.said === null ? null : <TooltipWords key={`now ${state.serial}`} said={state.said} isLeaving={false} />}
			</span>
			<span ref={arrow} className="wg-kit-tooltip-arrow" />
		</div>,
		portalLayer(),
	);
}
