import type { InkReading } from "../schema/browser-tab.schema.js";

export interface InkActivity {
	readonly reading: InkReading | null;
	readonly contentReadAt: number | null;
	readonly stoppedAt: number | null;
}

const NO_INK_ACTIVITY: InkActivity = {
	reading: null,
	contentReadAt: null,
	stoppedAt: null,
};

export abstract class InkActivityStore {
	abstract now(): InkActivity;
	abstract watch(changed: () => void): () => void;
	abstract change(next: Partial<InkActivity>, reason: string): void;
}

export class MemoryInkActivityStore extends InkActivityStore {
	private readonly watchers = new Set<() => void>();
	private activity: InkActivity = NO_INK_ACTIVITY;

	override now(): InkActivity {
		return this.activity;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override change(next: Partial<InkActivity>, reason: string): void {
		const became = {
			...this.activity,
			...next,
		};

		if (isSameActivity(this.activity, became)) {
			return;
		}

		const was = this.activity;
		this.activity = became;
		console.debug(`[widgetarium] ink activity ${JSON.stringify(was)} → ${JSON.stringify(became)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function isSameActivity(was: InkActivity, became: InkActivity): boolean {
	return (
		was.reading === became.reading && was.contentReadAt === became.contentReadAt && was.stoppedAt === became.stoppedAt
	);
}
