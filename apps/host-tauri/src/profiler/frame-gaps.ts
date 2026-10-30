const FRAME_BUDGET_MS = 1000 / 60;
const JANK_MS = 50;
const WATCH_AFTER_INPUT_MS = 2000;
const INPUTS = ["pointerdown", "pointermove", "wheel", "keydown"] as const;

type Input = (typeof INPUTS)[number];

interface FrameCounts {
	frames: number;
	janks: number;
	blockedMs: number;
	worstMs: number;
	worstAfter: Input | null;
	inputs: number;
}

type FrameReport = Readonly<FrameCounts>;

const NO_FRAMES: FrameReport = {
	frames: 0,
	janks: 0,
	blockedMs: 0,
	worstMs: 0,
	worstAfter: null,
	inputs: 0,
};

export class FrameGaps {
	private counts: FrameCounts = { ...NO_FRAMES };
	private lastInput: Input | null = null;
	private lastFrameAt: number | null = null;
	private watchUntil = 0;
	private isWatching = false;

	listen(page: Window): void {
		for (const input of INPUTS) {
			page.addEventListener(input, () => this.recordInput(input), {
				capture: true,
				passive: true,
			});
		}
	}

	drain(): FrameReport {
		const report = {
			...this.counts,
			blockedMs: Math.round(this.counts.blockedMs),
			worstMs: Math.round(this.counts.worstMs),
		};
		this.counts = { ...NO_FRAMES };
		return report;
	}

	private recordInput(input: Input): void {
		this.counts.inputs += 1;
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
			this.recordGap(now - this.lastFrameAt);
		}

		this.lastFrameAt = now;
		if (now > this.watchUntil) {
			this.isWatching = false;
			return;
		}

		requestAnimationFrame(this.onFrame);
	};

	private recordGap(gapMs: number): void {
		this.counts.frames += 1;
		if (gapMs > this.counts.worstMs) {
			this.counts.worstMs = gapMs;
			this.counts.worstAfter = this.lastInput;
		}

		if (gapMs >= JANK_MS) {
			this.counts.janks += 1;
			this.counts.blockedMs += gapMs - FRAME_BUDGET_MS;
		}
	}
}
