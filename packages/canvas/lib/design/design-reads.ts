import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { readLook } from "@widgetarium/core/app-look.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { AppLook } from "../../adapters/app-look/app-look.adapter.js";
import type { DesignFolder } from "../../adapters/design-folder/design-folder.adapter.js";
import type { DesignJobs } from "../../adapters/design-jobs/design-jobs.adapter.js";
import type { CanvasDoc } from "../../schema/doc.schema.js";
import type { DrawnDesign } from "../../schema/design.schema.js";
import type { Job } from "../../schema/job.schema.js";
import { onceSoon } from "./once-soon.js";
import { ReadCache } from "./read-cache.js";
import type { Read } from "./read-cache.js";

export interface DesignRead {
	readonly design: Read<DrawnDesign>;
	readonly docs: readonly CanvasDoc[];
	readonly jobs: readonly Job[];
}

export abstract class DesignReads {
	abstract read(app: string): Promise<DesignRead>;
	abstract design(app: string): Promise<DrawnDesign>;
	abstract spec(app: string): Promise<SpecRead | null>;
	abstract docs(app: string): Promise<readonly CanvasDoc[]>;
	abstract look(app: string): Promise<Parsed<Look> | null>;
	abstract watch(app: string, changed: () => void): () => void;
	abstract changed(app: string): void;
}

const JOBS_REDRAW_MS = 400;

interface Watch {
	readonly listeners: Set<() => void>;
	readonly stop: () => void;
}

export class CachedDesignReads extends DesignReads {
	constructor(
		private readonly designFolder: DesignFolder,
		private readonly designJobs: DesignJobs,
		private readonly appLook: AppLook,
	) {
		super();
	}

	private readonly designs = new ReadCache<DrawnDesign>();
	private readonly docsRead = new ReadCache<readonly CanvasDoc[]>();
	private readonly looks = new ReadCache<Parsed<Look> | null>();
	private readonly watches = new Map<string, Watch>();

	override async read(app: string): Promise<DesignRead> {
		const [docs, look] = await Promise.all([this.docs(app), this.look(app)]);
		const jobs = this.designJobs.jobs(app);
		const isStarting = jobs.length > 0 || docs.length > 0 || look !== null;
		const design = await this.designs.read(app, this.isWatched(app), () => this.designFolder.design(app, isStarting));
		return { design, docs, jobs };
	}

	override async design(app: string): Promise<DrawnDesign> {
		return (await this.read(app)).design.value;
	}

	override spec(app: string): Promise<SpecRead | null> {
		return this.designFolder.spec(app);
	}

	override async docs(app: string): Promise<readonly CanvasDoc[]> {
		return (await this.docsRead.read(app, this.isWatched(app), () => this.designFolder.docs(app))).value;
	}

	override async look(app: string): Promise<Parsed<Look> | null> {
		return (await this.looks.read(app, this.isWatched(app), () => this.lookOf(app))).value;
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
		this.told(app, this.watches.get(app)?.listeners ?? new Set());
	}

	private async lookOf(app: string): Promise<Parsed<Look> | null> {
		const text = await this.appLook.read(app);
		return text === null ? null : readLook(text);
	}

	private startedWatch(app: string): Watch {
		const listeners = new Set<() => void>();
		const heard = (): void => this.told(app, listeners);
		const stopChanges = this.designFolder.onChanged(app, heard);
		const jobsHeard = onceSoon(heard, JOBS_REDRAW_MS);
		const stopJobs = this.designJobs.onJobs(jobsHeard.call);
		return {
			listeners,
			stop: () => {
				stopChanges();
				stopJobs();
				jobsHeard.cancel();
			},
		};
	}

	private told(app: string, listeners: ReadonlySet<() => void>): void {
		this.stale(app);
		for (const listener of [...listeners]) listener();
	}

	private isWatched(app: string): boolean {
		return this.watches.has(app);
	}

	private stale(app: string): void {
		for (const cache of [this.designs, this.docsRead, this.looks]) cache.stale(app);
	}
}
