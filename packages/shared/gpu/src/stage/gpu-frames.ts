import { createContext, useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export interface GpuFrameClaim {
	readonly id: string;
	readonly title: string;
	readonly width: number;
	readonly minHeight: number;
	readonly node: HTMLElement;
}

export interface GpuFrames {
	claim(claim: GpuFrameClaim, element: ReactNode): () => void;
	redraw(id: string, element: ReactNode): void;
	fail(id: string, failure: unknown): void;
	failureOf(id: string): string | undefined;
	failures(): ReadonlyMap<string, string>;
	subscribe(listener: () => void): () => void;
}

export const GPU_FRAMES = createContext<GpuFrames | null>(null);

export function useGpuFailure(frames: GpuFrames | null, id: string): string | undefined {
	const subscribe = useCallback((listener: () => void) => frames?.subscribe(listener) ?? noop, [frames]);
	return useSyncExternalStore(subscribe, () => frames?.failureOf(id));
}

export function reasonOf(failure: unknown): string {
	return failure instanceof Error ? failure.message : String(failure);
}

function noop(): void {}
