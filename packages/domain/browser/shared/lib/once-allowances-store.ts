import type { OnceAllowance } from "../schema/site-access.schema.js";

export abstract class OnceAllowancesStore {
	abstract allowances(): readonly OnceAllowance[];
	abstract watch(changed: () => void): () => void;
	abstract keep(next: readonly OnceAllowance[], reason: string): void;
}

export class MemoryOnceAllowancesStore extends OnceAllowancesStore {
	private readonly watchers = new Set<() => void>();
	private kept: readonly OnceAllowance[] = [];

	override allowances(): readonly OnceAllowance[] {
		return this.kept;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override keep(next: readonly OnceAllowance[], reason: string): void {
		if (isSameAllowances(this.kept, next)) {
			return;
		}

		const was = this.kept;
		this.kept = next;
		console.debug(`[widgetarium] browser once allowances ${JSON.stringify(was)} → ${JSON.stringify(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function isSameAllowances(kept: readonly OnceAllowance[], next: readonly OnceAllowance[]): boolean {
	return kept.length === next.length && kept.every((allowance, at) => isSameAllowance(allowance, next[at]));
}

function isSameAllowance(allowance: OnceAllowance, other: OnceAllowance | undefined): boolean {
	return allowance.siteKey === other?.siteKey && allowance.tabId === other.tabId && allowance.until === other.until;
}
