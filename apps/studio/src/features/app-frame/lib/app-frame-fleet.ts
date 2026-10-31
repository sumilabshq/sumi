export interface CurrentRelease {
	readonly version: string;
	readonly pageUrl: string;
}

export interface RunningRelease extends CurrentRelease {
	readonly loads: number;
}

export interface FailedRelease {
	readonly id: string;
	readonly version: string;
}

export type FailAnswer =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

export interface FleetHooks {
	readonly fail: (failed: FailedRelease) => Promise<FailAnswer>;
	readonly onProblem: (reason: string) => void;
	readonly readyTimeoutMs: number;
}

interface ReadyClock {
	leftMs: number;
	startedAt: number;
	timer: ReturnType<typeof setTimeout> | null;
}

interface SeatedFrame {
	readonly id: string;
	readonly app: string;
	running: RunningRelease | null;
	isShown: boolean;
	isBusy: boolean;
	isWaiting: boolean;
	readyClock: ReadyClock | null;
}

export const READY_TIMEOUT_MS = 10_000;

export class AppFrameFleet {
	private readonly frames = new Map<string, SeatedFrame>();
	private readonly listeners = new Set<() => void>();
	private readonly proven = new Set<string>();
	private readonly failing = new Set<string>();
	private currents: ReadonlyMap<string, CurrentRelease | null> = new Map();
	private loads = 0;
	private isDocumentVisible = true;

	constructor(private readonly hooks: FleetHooks) {}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	runningOf(frameId: string): RunningRelease | null {
		return this.frames.get(frameId)?.running ?? null;
	}

	currentsAre(currents: ReadonlyMap<string, CurrentRelease | null>): void {
		this.currents = currents;

		for (const frame of this.frames.values()) {
			this.follow(frame);
		}

		this.told();
	}

	seat(frameId: string, app: string, isShown: boolean): () => void {
		const frame = seatedFrameOf(frameId, app, isShown);
		this.frames.set(frameId, frame);
		this.follow(frame);
		this.told();
		return () => {
			this.stopClock(frame);
			this.frames.delete(frameId);
		};
	}

	shownIs(frameId: string, isShown: boolean): void {
		const frame = this.frames.get(frameId);

		if (frame === undefined) {
			return;
		}

		frame.isShown = isShown;
		this.paceClock(frame);
	}

	documentVisibleIs(isVisible: boolean): void {
		this.isDocumentVisible = isVisible;

		for (const frame of this.frames.values()) {
			this.paceClock(frame);
		}
	}

	busyIs(frameId: string, isBusy: boolean): void {
		const frame = this.frames.get(frameId);

		if (frame === undefined) {
			return;
		}

		frame.isBusy = isBusy;

		if (frame.isWaiting) {
			this.follow(frame);
			this.told();
		}
	}

	ready(frameId: string): void {
		const frame = this.frames.get(frameId);

		if (frame === undefined || frame.running === null) {
			return;
		}

		this.stopClock(frame);
		this.proven.add(releaseKeyOf(frame.app, frame.running.version));
	}

	failedStart(frameId: string, reason: string): void {
		const frame = this.frames.get(frameId);

		if (frame !== undefined) {
			this.failRelease(frame, `failed before it said ready: ${reason}`);
		}
	}

	private follow(frame: SeatedFrame): void {
		const current = this.currents.get(frame.app) ?? null;

		if (current === null) {
			this.stopRunning(frame);
			return;
		}

		if (!keepsRunning(frame, current)) {
			this.run(frame, current);
		}
	}

	private stopRunning(frame: SeatedFrame): void {
		if (frame.running !== null) {
			this.run(frame, null);
		}
	}

	private run(frame: SeatedFrame, release: CurrentRelease | null): void {
		const was = frame.running?.version ?? "nothing";
		this.stopClock(frame);
		this.loads += 1;
		frame.running = runningReleaseOf(release, this.loads);
		frame.isBusy = false;
		frame.isWaiting = false;
		console.info(`[widgetarium] app frame ${frame.id} runs ${frame.app} ${was} → ${release?.version ?? "nothing"}`);

		if (release !== null && !this.proven.has(releaseKeyOf(frame.app, release.version))) {
			this.startClock(frame);
		}
	}

	private startClock(frame: SeatedFrame): void {
		frame.readyClock = {
			leftMs: this.hooks.readyTimeoutMs,
			startedAt: 0,
			timer: null,
		};
		this.paceClock(frame);
	}

	private paceClock(frame: SeatedFrame): void {
		const clock = frame.readyClock;

		if (clock === null) {
			return;
		}

		if (frame.isShown && this.isDocumentVisible) {
			this.resumeClock(frame, clock);
			return;
		}

		pauseClock(clock);
	}

	private resumeClock(frame: SeatedFrame, clock: ReadyClock): void {
		if (clock.timer !== null) {
			return;
		}

		clock.startedAt = Date.now();
		clock.timer = setTimeout(() => this.timedOut(frame), clock.leftMs);
	}

	private timedOut(frame: SeatedFrame): void {
		frame.readyClock = null;
		this.failRelease(frame, `sent no ready within ${this.hooks.readyTimeoutMs} ms of being shown`);
	}

	private failRelease(frame: SeatedFrame, why: string): void {
		if (frame.running === null) {
			return;
		}

		const key = releaseKeyOf(frame.app, frame.running.version);

		if (this.proven.has(key) || this.failing.has(key)) {
			return;
		}

		console.error(`[widgetarium] app frame ${frame.id}: ${key} ${why}; it is marked failed`);
		this.markFailed(key, {
			id: frame.app,
			version: frame.running.version,
		});
	}

	private markFailed(key: string, failed: FailedRelease): void {
		this.failing.add(key);
		this.stopClocksOf(key);
		this.hooks.fail(failed).then(
			(answer) => this.failSettled(key, answer),
			(thrown: unknown) => this.failSettled(key, thrownAnswerOf(thrown)),
		);
	}

	private failSettled(key: string, answer: FailAnswer): void {
		this.failing.delete(key);

		if (answer.ok) {
			return;
		}

		this.hooks.onProblem(`${key} could not be marked failed (${answer.reason}); its next failed start tries again`);

		for (const frame of this.framesRunning(key)) {
			this.startClock(frame);
		}
	}

	private stopClocksOf(key: string): void {
		for (const frame of this.framesRunning(key)) {
			this.stopClock(frame);
		}
	}

	private framesRunning(key: string): readonly SeatedFrame[] {
		return [...this.frames.values()].filter(
			(frame) => frame.running !== null && releaseKeyOf(frame.app, frame.running.version) === key,
		);
	}

	private stopClock(frame: SeatedFrame): void {
		if (frame.readyClock?.timer != null) {
			clearTimeout(frame.readyClock.timer);
		}

		frame.readyClock = null;
	}

	private told(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}

function releaseKeyOf(app: string, version: string): string {
	return `${app}@${version}`;
}

function isSameRelease(running: RunningRelease, current: CurrentRelease): boolean {
	return running.version === current.version && running.pageUrl === current.pageUrl;
}

function seatedFrameOf(id: string, app: string, isShown: boolean): SeatedFrame {
	return {
		id,
		app,
		running: null,
		isShown,
		isBusy: false,
		isWaiting: false,
		readyClock: null,
	};
}

function keepsRunning(frame: SeatedFrame, current: CurrentRelease): boolean {
	if (frame.running === null) {
		return false;
	}

	if (isSameRelease(frame.running, current)) {
		frame.isWaiting = false;
		return true;
	}

	if (!frame.isBusy) {
		return false;
	}

	frame.isWaiting = true;
	console.info(`[widgetarium] app frame ${frame.id} waits on ${frame.app} ${current.version}: it is busy`);
	return true;
}

function runningReleaseOf(release: CurrentRelease | null, loads: number): RunningRelease | null {
	if (release === null) {
		return null;
	}

	return {
		...release,
		loads,
	};
}

function pauseClock(clock: ReadyClock): void {
	if (clock.timer === null) {
		return;
	}

	clearTimeout(clock.timer);
	clock.timer = null;
	clock.leftMs = Math.max(0, clock.leftMs - (Date.now() - clock.startedAt));
}

function thrownAnswerOf(thrown: unknown): FailAnswer {
	return {
		ok: false,
		reason: thrown instanceof Error ? thrown.message : String(thrown),
	};
}
