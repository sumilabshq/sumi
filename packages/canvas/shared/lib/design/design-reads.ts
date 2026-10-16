import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { SharedSubscriptions } from "@widgetarium/core/shared-subscriptions.js";
import { lookPathOf, readLook } from "@widgetarium/core/app-look.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { DesignFilesGateway } from "../../../gateways/design-files/design-files.gateway.js";
import type { DesignFolderGateway } from "../../../gateways/design-folder/design-folder.gateway.js";
import type { AgentJobsGateway } from "../../../gateways/agent-jobs/agent-jobs.gateway.js";
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

export class CachedDesignReads extends DesignReads {
	constructor(
		private readonly designFolderGateway: DesignFolderGateway,
		private readonly agentJobsGateway: AgentJobsGateway,
		private readonly designFilesGateway: DesignFilesGateway,
	) {
		super();
	}

	private readonly designs = new ReadCache<DrawnDesign>();
	private readonly docsRead = new ReadCache<readonly CanvasDoc[]>();
	private readonly looks = new ReadCache<Parsed<Look> | null>();
	private readonly watches = new SharedSubscriptions();

	override async read(app: string): Promise<DesignRead> {
		const [docs, look] = await Promise.all([this.docs(app), this.look(app)]);
		const jobs = this.agentJobsGateway.jobsOf(app);
		const isStarting = jobs.length > 0 || docs.length > 0 || look !== null;
		const design = await this.designs.read(app, this.isWatched(app), () =>
			this.designFolderGateway.readDesign(app, isStarting),
		);
		return { design, docs, jobs };
	}

	override async design(app: string): Promise<DrawnDesign> {
		return (await this.read(app)).design.value;
	}

	override spec(app: string): Promise<SpecRead | null> {
		return this.designFolderGateway.readSpec(app);
	}

	override async docs(app: string): Promise<readonly CanvasDoc[]> {
		return (await this.docsRead.read(app, this.isWatched(app), () => this.designFolderGateway.readDocs(app))).value;
	}

	override async look(app: string): Promise<Parsed<Look> | null> {
		return (await this.looks.read(app, this.isWatched(app), () => this.lookOf(app))).value;
	}

	override watch(app: string, changed: () => void): () => void {
		return this.watches.join(app, (tell) => this.startedWatch(app, tell), changed);
	}

	override changed(app: string): void {
		this.stale(app);
		this.watches.tell(app);
	}

	private async lookOf(app: string): Promise<Parsed<Look> | null> {
		const text = await this.designFilesGateway.read(lookPathOf(app));
		return text === null ? null : readLook(text);
	}

	private startedWatch(app: string, tell: () => void): () => void {
		const heard = (): void => {
			this.stale(app);
			tell();
		};
		const stopChanges = this.designFolderGateway.watch(app, heard);
		const jobsHeard = onceSoon(heard, JOBS_REDRAW_MS);
		const stopJobs = this.agentJobsGateway.watch(jobsHeard.call);
		return () => {
			stopChanges();
			stopJobs();
			jobsHeard.cancel();
			this.stale(app);
		};
	}

	private isWatched(app: string): boolean {
		return this.watches.isJoined(app);
	}

	private stale(app: string): void {
		for (const cache of [this.designs, this.docsRead, this.looks]) cache.stale(app);
	}
}
