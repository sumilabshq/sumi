import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Spot } from "../../schemas/selection.schema.js";
import { useLingeringSpot } from "./hooks/selection/use-lingering-spot.js";

export type SpotTone = "hover" | "picked";

const TONE: Readonly<Record<SpotTone, string>> = {
	hover: "cv:bg-[color-mix(in_srgb,var(--wg-kit-accent)_8%,transparent)]",
	picked: "cv:bg-[color-mix(in_srgb,var(--wg-kit-accent)_16%,transparent)]",
};

export function Highlight({
	spot,
	tone,
}: {
	readonly spot: Spot | null;
	readonly tone: SpotTone;
}): ReactElement | null {
	const shown = useLingeringSpot(spot);
	if (!shown) return null;
	const { target, radius } = shown;
	return (
		<div
			className={`cv:pointer-events-none cv:absolute cv:transition-[opacity,left,top,width,height,border-radius] cv:duration-200 cv:ease-standard cv:motion-safe:animate-canvas-fade-in cv:motion-reduce:transition-none ${TONE[tone]} ${spot ? "cv:opacity-100" : "cv:opacity-0"}`}
			style={{ left: target.x, top: target.y, width: target.width, height: target.height, borderRadius: radius }}
			data-canvas-spot={tone}
		/>
	);
}
