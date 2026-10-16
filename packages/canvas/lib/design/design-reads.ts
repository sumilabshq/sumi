import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look as AppLook } from "@widgetarium/core/app-look.js";
import type { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import type { CanvasDoc } from "../../schema/doc.schema.js";
import type { DrawnDesign } from "../../schema/design.schema.js";
import type { Job } from "../../schema/job.schema.js";
import { ReadCache } from "./read-cache.js";
import type { Read } from "./read-cache.js";

export interface DesignRead {
	readonly design: Read<DrawnDesign>;
	readonly docs: readonly CanvasDoc[];
	readonly jobs: readonly Job[];
}

export abstract class DesignReads {
	abstract read(app: string): Promise<DesignRead>;
	abstract docs(app: string): Promise<readonly CanvasDoc[]>;
	abstract look(app: string): Promise<Parsed<AppLook> | null>;
	abstract watch(app: string, changed: () => void): () => void;
	abstract changed(app: string): void;
}

interface Watch {
	readonly listeners: Set<() => void>;
	readonly stop: () => void;
}

export class CachedDesignReads extends DesignReads {
	constructor(private readonly designSource: DesignSource) {
		super();
	}

	private readonly designs = new ReadCache<DrawnDesign>();
	private readonly docsRead = new ReadCache<readonly CanvasDoc[]>();
	private readonly looks = new ReadCache<Parsed<AppLook> | null>();
	private readonly watches = new Map<string, Watch>();

	override async read(app: string): Promise<DesignRead> {
		const [docs, look] = await Promise.all([this.docs(app), this.look(app)]);
		const jobs = this.designSource.jobs(app);
		const isStarting = jobs.length > 0 || docs.length > 0 || look !== null;
		const design = await this.designs.read(app, this.isWatched(app), () => this.designSource.design(app, isStarting));
		return { design, docs, jobs };
	}

	override async docs(app: string): Promise<readonly CanvasDoc[]> {
		return (await this.docsRead.read(app, this.isWatched(app), () => this.designSource.docs(app))).value;
	}

	override async look(app: string): Promise<Parsed<AppLook> | null> {
		return (await this.looks.read(app, this.isWatched(app), () => this.designSource.look(app))).value;
	}

	override watch(app: string, changed: () => void): () => void {
		const watch = this.watches.get(app) ?? this.startedWatch(app);
		this.watches.set(app, watch);
		watch.listeners.add(changed);
		return () => {
			watch.listeners.delete(changed);
			if (watch.listeners.size > 0 || this.watches.get(app) !== watch) return;
			watch.stop();
			this.watches.delete(app);
			this.stale(app);
		};
	}

	override changed(app: string): void {
		this.stale(app);
		for (const listener of [...(this.watches.get(app)?.listeners ?? [])]) listener();
	}

	private startedWatch(app: string): Watch {
		const listeners = new Set<() => void>();
		const heard = (): void => {
			this.stale(app);
			for (const listener of [...listeners]) listener();
		};
		const stopChanges = this.designSource.onChanged(app, heard);
		const stopJobs = this.designSource.onJobs(heard);
		return {
			listeners,
			stop: () => {
				stopChanges();
				stopJobs();
			},
		};
	}

	private isWatched(app: string): boolean {
		return this.watches.has(app);
	}

	private stale(app: string): void {
		for (const cache of [this.designs, this.docsRead, this.looks]) cache.stale(app);
	}
}
