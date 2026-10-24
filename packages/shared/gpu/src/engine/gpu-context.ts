import type { CanvasKit, Paint, TypefaceFontProvider } from "canvaskit-wasm";
import type { Config as YogaConfig, Yoga } from "yoga-layout/load";
import type { ComputedStyles } from "../style/computed-styles.js";
import type { GpuTokens } from "../style/gpu-tokens.js";

export interface Animated {
	advance(now: number): boolean;
}

export interface GpuContext {
	readonly ck: CanvasKit;
	readonly fonts: TypefaceFontProvider;
	readonly fill: Paint;
	readonly stroke: Paint;
	readonly yoga: Yoga;
	readonly yogaConfig: YogaConfig;
	readonly animating: Set<Animated>;
	tokens: GpuTokens;
	readonly styles: ComputedStyles | null;
	invalidate: () => void;
}

export type HostType = string;

export interface HostProps {
	readonly [name: string]: unknown;
	readonly children?: unknown;
}

export function advanceAnimations(context: GpuContext, now: number): boolean {
	for (const animated of context.animating) if (!animated.advance(now)) context.animating.delete(animated);
	return context.animating.size > 0;
}
