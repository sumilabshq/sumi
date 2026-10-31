import type { LayoutMotion } from "../layout-motion/layout-motion.js";
import { measuredLayoutOf } from "./sidebar-measure.js";
import type { SidebarLayout } from "./sidebar-layout.js";

const STALE_WAIT_MS = 120;

export class LaidOutSidebar {
	private layout: SidebarLayout | null = null;
	private awaitedSince = 0;

	constructor(private readonly motion: LayoutMotion) {}

	measure(holder: HTMLElement | null): void {
		this.awaitedSince = 0;
		this.layout = holder === null ? null : measuredLayoutOf(holder);
	}

	await(): void {
		this.awaitedSince = performance.now();
	}

	settlesInMs(): number {
		return this.motion.msLeft();
	}

	staleForMs(): number {
		const awaitedForMs = this.awaitedSince === 0 ? 0 : STALE_WAIT_MS - (performance.now() - this.awaitedSince);
		return Math.max(0, awaitedForMs, this.motion.msLeft());
	}

	isAwaited(): boolean {
		return this.awaitedSince !== 0 && performance.now() - this.awaitedSince < STALE_WAIT_MS;
	}

	now(holder: HTMLElement): SidebarLayout {
		if (this.layout !== null && (this.motion.isMoving() || this.isAwaited())) {
			return this.layout;
		}

		this.awaitedSince = 0;
		this.layout = measuredLayoutOf(holder);
		return this.layout;
	}
}
