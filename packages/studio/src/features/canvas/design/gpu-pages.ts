import { createContext, useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export interface GpuPageClaim {
	readonly id: string;
	readonly title: string;
	readonly width: number;
	readonly minHeight: number;
	readonly node: HTMLElement;
}

export interface GpuPages {
	claim(claim: GpuPageClaim, element: ReactNode): () => void;
	redraw(id: string, element: ReactNode): void;
	fail(id: string, failure: unknown): void;
	failureOf(id: string): string | undefined;
	failures(): ReadonlyMap<string, string>;
	subscribe(listener: () => void): () => void;
}

export const GPU_PAGES = createContext<GpuPages | null>(null);

export function useGpuFailure(pages: GpuPages | null, id: string): string | undefined {
	const subscribe = useCallback((listener: () => void) => pages?.subscribe(listener) ?? noop, [pages]);
	return useSyncExternalStore(subscribe, () => pages?.failureOf(id));
}

export function reasonOf(failure: unknown): string {
	return failure instanceof Error ? failure.message : String(failure);
}

function noop(): void {}
