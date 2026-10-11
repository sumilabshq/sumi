import type { CanvasKit, Paint, TypefaceFontProvider } from "canvaskit-wasm";
import type { Config as YogaConfig, Yoga } from "yoga-layout/load";
import type { GpuTokens } from "./gpu-tokens.js";

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
	invalidate: () => void;
}

export type HostType = "View" | "Text" | "Icon";

export interface HostProps {
	readonly className?: string | undefined;
	readonly children?: unknown;
	readonly onPress?: (() => void) | undefined;
	readonly name?: string | undefined;
	readonly size?: number | undefined;
}

export function advanceAnimations(context: GpuContext, now: number): boolean {
	for (const animated of context.animating) if (!animated.advance(now)) context.animating.delete(animated);
	return context.animating.size > 0;
}
