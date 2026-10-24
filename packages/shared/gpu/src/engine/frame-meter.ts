import type { FrameRate } from "./frame-rate.js";

export interface MeteredView {
	readonly gl: () => WebGL2RenderingContext | null;
	readonly render: () => void;
}

const MOST_IN_FLIGHT = 3;

export function meterFrames(rate: FrameRate, view: MeteredView): () => void {
	const meter = new FrameMeter(rate, view);
	const followed = (): void => meter.follow();
	const stopDriving = rate.drive(followed);
	document.addEventListener("visibilitychange", followed);
	followed();
	return () => {
		stopDriving();
		document.removeEventListener("visibilitychange", followed);
		meter.stop();
	};
}

class FrameMeter {
	private loop = 0;
	private fences: WebGLSync[] = [];

	constructor(
		private readonly rate: FrameRate,
		private readonly view: MeteredView,
	) {}

	follow(): void {
		if (this.rate.isWatched() && !document.hidden) {
			this.start();
			return;
		}

		this.stop();
	}

	stop(): void {
		cancelAnimationFrame(this.loop);
		this.loop = 0;
		const gl = this.view.gl();
		for (const fence of this.fences) {
			gl?.deleteSync(fence);
		}

		this.fences = [];
		this.rate.stopped();
	}

	private start(): void {
		if (this.loop === 0) {
			this.loop = requestAnimationFrame(this.ticked);
		}
	}

	private readonly ticked = (): void => {
		this.loop = requestAnimationFrame(this.ticked);
		const gl = this.view.gl();
		if (!gl) {
			return;
		}

		this.collectFinished(gl);
		if (this.fences.length < MOST_IN_FLIGHT) {
			this.view.render();
			this.fenced(gl);
		}
	};

	private fenced(gl: WebGL2RenderingContext): void {
		const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
		if (fence) {
			gl.flush();
			this.fences.push(fence);
		}
	}

	private collectFinished(gl: WebGL2RenderingContext): void {
		const [oldest] = this.fences;
		if (!oldest || gl.clientWaitSync(oldest, 0, 0) === gl.TIMEOUT_EXPIRED) {
			return;
		}

		gl.deleteSync(oldest);
		this.fences.shift();
		this.rate.finished(performance.now());
		this.collectFinished(gl);
	}
}
