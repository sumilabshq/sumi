import type { DocKind, DocState, StoreClient, StoreRoot } from "./store-client.js";

const WRITE_DELAY_MS = 400;
const MOST_WRITE_TRIES = 3;
const UNREAD: DocState<never> = {
	doc: null,
	rev: 0,
	isReadOnly: false,
	quarantined: null,
};

export interface DocAt<Doc> {
	readonly store: StoreClient;
	readonly root: StoreRoot;
	readonly kind: DocKind<Doc>;
	readonly empty: Doc;
}

interface PendingChange<Doc> {
	readonly patch: Partial<Doc>;
	readonly reasons: readonly string[];
}

export class HeldDoc<Doc extends object> {
	private pending: PendingChange<Doc> | null = null;
	private changedBeforeRead: Partial<Doc> | null = null;
	private writing: Promise<void> = Promise.resolve();
	private delayedWrite: ReturnType<typeof setTimeout> | null = null;
	private readonly listeners = new Set<() => void>();

	private constructor(
		private readonly at: DocAt<Doc>,
		private held: DocState<Doc>,
	) {}

	static async read<Doc extends object>(at: DocAt<Doc>): Promise<HeldDoc<Doc>> {
		return new HeldDoc(at, await at.store.readDoc(at.root, at.kind));
	}

	// TRADE-OFF: answers the empty doc until the read lands, so a synchronous reader sees defaults for a moment
	static reading<Doc extends object>(at: DocAt<Doc>): HeldDoc<Doc> {
		const held = new HeldDoc(at, UNREAD);
		held.changedBeforeRead = {};
		void at.store.readDoc(at.root, at.kind).then(
			(fresh) => held.landRead(fresh),
			(failure: unknown) => console.error(`[ink] ${held.label()} could not be read`, failure),
		);
		return held;
	}

	now = (): Doc => this.held.doc ?? this.at.empty;

	watch = (changed: () => void): (() => void) => {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	};

	change(patch: Partial<Doc>, reason: string): void {
		this.changedBeforeRead = this.changedBeforeRead === null ? null : { ...this.changedBeforeRead, ...patch };
		this.held = {
			...this.held,
			doc: {
				...this.now(),
				...patch,
			},
		};
		this.pending = {
			patch: {
				...this.pending?.patch,
				...patch,
			},
			reasons: [...(this.pending?.reasons ?? []), reason],
		};
		this.delayWrite();
		for (const changed of [...this.listeners]) {
			changed();
		}
	}

	flush(): Promise<void> {
		this.cancelDelayedWrite();
		this.writing = this.writing.then(() => this.writePending());
		return this.writing;
	}

	private landRead(fresh: DocState<Doc>): void {
		const changed = this.changedBeforeRead ?? {};
		this.changedBeforeRead = null;
		this.held = {
			...fresh,
			rev: Math.max(fresh.rev, this.held.rev),
			doc: {
				...(fresh.doc ?? this.at.empty),
				...changed,
			},
		};
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	private async writePending(): Promise<void> {
		const change = this.pending;
		this.pending = null;
		if (change === null) {
			return;
		}

		const isWritten = await this.writeChange(change).catch((failure: unknown) => {
			console.error(`[ink] ${this.label()} could not be written`, failure);
			return false;
		});
		if (!isWritten) {
			this.keepForNextWrite(change);
		}
	}

	private keepForNextWrite(change: PendingChange<Doc>): void {
		this.pending = {
			patch: {
				...change.patch,
				...this.pending?.patch,
			},
			reasons: [...change.reasons, ...(this.pending?.reasons ?? [])],
		};
	}

	private delayWrite(): void {
		this.cancelDelayedWrite();
		this.delayedWrite = setTimeout(() => void this.flush(), WRITE_DELAY_MS);
	}

	private cancelDelayedWrite(): void {
		if (this.delayedWrite !== null) {
			clearTimeout(this.delayedWrite);
		}

		this.delayedWrite = null;
	}

	private async writeChange(change: PendingChange<Doc>): Promise<boolean> {
		if (this.held.isReadOnly) {
			console.warn(`[ink] ${this.label()} is newer than this app or unreadable, changes stay in memory`);
			return true;
		}

		const reason = [...new Set(change.reasons)].join(", ");
		for (let tries = 0; tries < MOST_WRITE_TRIES; tries += 1) {
			const answer = await this.at.store.replaceDoc(this.at.root, this.at.kind, {
				doc: this.now(),
				baseRev: this.held.rev,
				reason,
			});
			if (answer.ok) {
				this.held = {
					...this.held,
					rev: answer.rev,
				};
				return true;
			}

			await this.rebase(change);
		}

		console.error(`[ink] ${this.label()} kept changing underneath, "${reason}" waits for the next write`);
		return false;
	}

	private async rebase(change: PendingChange<Doc>): Promise<void> {
		const fresh = await this.at.store.readDoc(this.at.root, this.at.kind);
		this.held = {
			...fresh,
			doc: {
				...(fresh.doc ?? this.at.empty),
				...change.patch,
				...this.pending?.patch,
			},
		};
	}

	private label(): string {
		return `${this.at.root}:${this.at.kind.file}`;
	}
}
