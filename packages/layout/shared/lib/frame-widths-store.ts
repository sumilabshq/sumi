import type { FrameWidths } from "../schema/frame-widths.schema.js";

export class FrameWidthsStore {
	private readonly watchers = new Set<() => void>();

	constructor(
		private widths: FrameWidths,
		private readonly keep: (widths: FrameWidths, reason: string) => void,
	) {}

	now = (): FrameWidths => this.widths;

	watch = (changed: () => void): (() => void) => {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	};

	become(next: FrameWidths, reason: string): void {
		const was = this.widths;

		if (was.left === next.left && was.chat === next.chat) {
			return;
		}

		console.info(`[widgetarium] frame widths ${JSON.stringify(was)} → ${JSON.stringify(next)} (${reason})`);
		this.widths = next;
		this.keep(next, reason);

		for (const changed of this.watchers) {
			changed();
		}
	}
}
