import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look as AppLook } from "@widgetarium/core/app-look.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import type { DrawnDesign } from "../../schemas/design.schema.js";
import type { DesignSource } from "./design-source.js";

export interface Read<T> {
	readonly value: T;
	readonly version: number;
}

interface Held<T> {
	readonly value: Promise<T>;
	readonly version: number;
	isFresh: boolean;
}

interface Watch {
	readonly listeners: Set<() => void>;
	readonly stop: () => void;
}

export interface ReadCache<T> {
	read(source: DesignSource, app: string, load: () => Promise<T>): Promise<Read<T>>;
	stale(source: DesignSource, app: string): void;
}

const WATCHES = new WeakMap<DesignSource, Map<string, Watch>>();

export const DESIGN_READS = createReadCache<DrawnDesign>();
export const DOCS_READS = createReadCache<readonly CanvasDoc[]>();
export const LOOK_READS = createReadCache<Parsed<AppLook> | null>();

export function staleReads(source: DesignSource, app: string): void {
	for (const cache of [DESIGN_READS, DOCS_READS, LOOK_READS]) cache.stale(source, app);
}

export function watchSource(source: DesignSource, app: string, changed: () => void): () => void {
	const watches = WATCHES.get(source) ?? new Map<string, Watch>();
	WATCHES.set(source, watches);
	const watch = watches.get(app) ?? startedWatch(source, app);
	watches.set(app, watch);
	watch.listeners.add(changed);
	return () => {
		watch.listeners.delete(changed);
		if (watch.listeners.size > 0) return;
		watch.stop();
		watches.delete(app);
		staleReads(source, app);
	};
}

function startedWatch(source: DesignSource, app: string): Watch {
	const listeners = new Set<() => void>();
	const heard = (): void => {
		staleReads(source, app);
		for (const listener of [...listeners]) listener();
	};
	const stopChanges = source.onChanged(app, heard);
	const stopJobs = source.onJobs(heard);
	return {
		listeners,
		stop: () => {
			stopChanges();
			stopJobs();
		},
	};
}

function isWatched(source: DesignSource, app: string): boolean {
	return WATCHES.get(source)?.has(app) === true;
}

function createReadCache<T>(): ReadCache<T> {
	const held = new WeakMap<DesignSource, Map<string, Held<T>>>();
	let versions = 0;
	return {
		read: async (source, app, load) => {
			const byApp = held.get(source) ?? new Map<string, Held<T>>();
			held.set(source, byApp);
			const fresh = byApp.get(app);
			if (fresh?.isFresh) return { value: await fresh.value, version: fresh.version };
			versions += 1;
			const loading: Held<T> = { value: load(), version: versions, isFresh: isWatched(source, app) };
			byApp.set(app, loading);
			loading.value.catch(() => (loading.isFresh = false));
			return { value: await loading.value, version: loading.version };
		},
		stale: (source, app) => {
			const one = held.get(source)?.get(app);
			if (one) one.isFresh = false;
		},
	};
}
