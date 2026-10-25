import { useSyncExternalStore } from "react";

export type RenamingPlace = "row" | "crumb";

interface Renamed {
	readonly id: string;
	readonly place: RenamingPlace;
}

export class ChatRenaming {
	private renamed: Renamed | null = null;
	private readonly watchers = new Set<() => void>();

	now = (): Renamed | null => this.renamed;

	start = (id: string, place: RenamingPlace): void => this.setRenamed({ id, place });

	stop = (): void => this.setRenamed(null);

	watch = (changed: () => void): (() => void) => {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	};

	private setRenamed(renamed: Renamed | null): void {
		this.renamed = renamed;
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

export function useRenamingIdIn(renaming: ChatRenaming, place: RenamingPlace): string | null {
	const renamed = useSyncExternalStore(renaming.watch, renaming.now);
	return renamed?.place === place ? renamed.id : null;
}
