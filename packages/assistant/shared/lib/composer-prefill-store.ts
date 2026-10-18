import type { ComposerPrefill } from "../schema/composer-prefill.schema.js";

export abstract class ComposerPrefillStore {
	abstract latest(): ComposerPrefill | null;
	abstract watch(changed: () => void): () => void;
	abstract ask(text: string, reason: string): void;
}

export class MemoryComposerPrefillStore extends ComposerPrefillStore {
	private readonly watchers = new Set<() => void>();
	private asked: ComposerPrefill | null = null;

	override latest(): ComposerPrefill | null {
		return this.asked;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override ask(text: string, reason: string): void {
		const was = this.asked;
		this.asked = {
			id: (was?.id ?? 0) + 1,
			text,
		};
		console.debug(
			`[widgetarium] composer prefill ${JSON.stringify(was?.text ?? null)} → ${JSON.stringify(text)} (${reason})`,
		);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}
