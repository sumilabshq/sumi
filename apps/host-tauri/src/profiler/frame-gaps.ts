const FRAME_BUDGET_MS = 1000 / 60;
const JANK_MS = 50;
const WATCH_AFTER_INPUT_MS = 2000;
const INPUTS = ["pointerdown", "pointermove", "wheel", "keydown"] as const;

type Input = (typeof INPUTS)[number];

export interface FrameReport {
	readonly frames: number;
	readonly janks: number;
	readonly blockedMs: number;
	readonly worstMs: number;
	readonly worstAfter: Input | null;
	readonly inputs: number;
}

export class FrameGaps {
	private frames = 0;
	private janks = 0;
	private blockedMs = 0;
	private worstMs = 0;
	private worstAfter: Input | null = null;
	private inputs = 0;
	private lastInput: Input | null = null;
	private lastFrameAt: number | null = null;
	private watchUntil = 0;
	private isWatching = false;

	listen(page: Window): void {
		for (const input of INPUTS) {
			page.addEventListener(input, () => this.heardInput(input), {
				capture: true,
				passive: true,
			});
		}
	}

	drain(): FrameReport {
		const report = {
			frames: this.frames,
			janks: this.janks,
			blockedMs: Math.round(this.blockedMs),
			worstMs: Math.round(this.worstMs),
			worstAfter: this.worstAfter,
			inputs: this.inputs,
		};
		this.frames = 0;
		this.janks = 0;
		this.blockedMs = 0;
		this.worstMs = 0;
		this.worstAfter = null;
		this.inputs = 0;
		return report;
	}

	private heardInput(input: Input): void {
		this.inputs += 1;
		this.lastInput = input;
		this.watchUntil = performance.now() + WATCH_AFTER_INPUT_MS;
		if (this.isWatching) {
			return;
		}

		this.isWatching = true;
		this.lastFrameAt = null;
		requestAnimationFrame(this.onFrame);
	}

	private readonly onFrame = (now: number): void => {
		if (this.lastFrameAt !== null) {
			this.countGap(now - this.lastFrameAt);
		}

		this.lastFrameAt = now;
		if (now > this.watchUntil) {
			this.isWatching = false;
			return;
		}

		requestAnimationFrame(this.onFrame);
	};

	private countGap(gapMs: number): void {
		this.frames += 1;
		if (gapMs > this.worstMs) {
			this.worstMs = gapMs;
			this.worstAfter = this.lastInput;
		}

		if (gapMs >= JANK_MS) {
			this.janks += 1;
			this.blockedMs += gapMs - FRAME_BUDGET_MS;
		}
	}
}
