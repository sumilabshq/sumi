export interface DroppedFile {
	readonly name: string;
	readonly size: number;
	readonly file: () => Promise<File>;
}

export type FileDragEvent =
	| { readonly kind: "enter" }
	| { readonly kind: "over" }
	| { readonly kind: "leave" }
	| {
			readonly kind: "drop";
			readonly files: readonly DroppedFile[];
			readonly folders: readonly string[];
	  };

export type PageDrag = "enter" | "leave" | "drop";

export interface DroppedBatch {
	readonly id: string;
	readonly files: readonly DroppedFile[];
	readonly folders: readonly string[];
}

export interface FileDrag {
	readonly isOver: boolean;
	readonly dropped: string | null;
}

export abstract class FileDragStore {
	abstract now(): FileDrag;
	abstract watch(changed: () => void): () => void;
	abstract hear(event: FileDragEvent): void;
	abstract hearPage(drag: PageDrag): void;
	abstract take(id: string): DroppedBatch | null;
}

export class MemoryFileDragStore extends FileDragStore {
	private readonly watchers = new Set<() => void>();
	private pageDepth = 0;
	private isHostOver = false;
	private dropped: DroppedBatch | null = null;
	private told: FileDrag = {
		isOver: false,
		dropped: null,
	};

	override now(): FileDrag {
		return this.told;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override hear(event: FileDragEvent): void {
		this.isHostOver = event.kind === "enter" || event.kind === "over";

		if (event.kind === "drop") {
			this.dropped = {
				id: crypto.randomUUID(),
				files: event.files,
				folders: event.folders,
			};
		}

		this.tell(`the host heard a file drag ${event.kind}`);
	}

	override hearPage(drag: PageDrag): void {
		this.pageDepth = drag === "enter" ? this.pageDepth + 1 : Math.max(0, this.pageDepth - 1);

		if (drag === "drop") {
			this.pageDepth = 0;
		}

		this.tell(`the page heard a file drag ${drag}`);
	}

	override take(id: string): DroppedBatch | null {
		const batch = this.dropped;

		if (batch?.id !== id) {
			return null;
		}

		this.dropped = null;
		this.tell("the dropped files were taken to attach");
		return batch;
	}

	private tell(reason: string): void {
		const next: FileDrag = {
			isOver: this.pageDepth > 0 || this.isHostOver,
			dropped: this.dropped?.id ?? null,
		};

		if (next.isOver === this.told.isOver && next.dropped === this.told.dropped) {
			return;
		}

		const was = this.told;
		this.told = next;
		console.debug(`[widgetarium] file drag ${JSON.stringify(was)} → ${JSON.stringify(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}
