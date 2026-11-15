import type { TabDrop } from "@widgetarium/app-host/contract";
import { isSameDrop, renameDrop } from "./tab-drops.js";
import type { Rename } from "./tab-drops.js";
import { renameSource } from "./drag-source.js";
import type { DragSource } from "./drag-source.js";

export interface DragPreviewState {
	readonly lift: number;
	readonly source: DragSource;
	readonly drop: TabDrop;
	readonly isMarked: boolean;
	readonly isLanding: boolean;
}

export class DragPreview {
	private state: DragPreviewState | null = null;
	private readonly listeners = new Set<() => void>();
	private lifts = 0;
	private onRest: () => void = () => undefined;

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	readonly now = (): DragPreviewState | null => this.state;

	lift(source: DragSource, drop: TabDrop): number {
		this.restNow();
		this.lifts += 1;
		this.write({
			lift: this.lifts,
			source,
			drop,
			isMarked: true,
			isLanding: false,
		});
		return this.lifts;
	}

	isShowing(lift: number): boolean {
		return this.state?.lift === lift;
	}

	aim(drop: TabDrop, isMarked: boolean): boolean {
		const { state } = this;

		if (state === null || state.isLanding || (isSameDrop(state.drop, drop) && state.isMarked === isMarked)) {
			return false;
		}

		this.write({
			...state,
			drop,
			isMarked,
		});
		return true;
	}

	readonly renameItem = (rename: Rename): void => {
		const { state } = this;
		const source = state === null ? null : renameSource(state.source, rename);
		const drop = state === null ? null : renameDrop(state.drop, rename);

		if (state === null || source === null || drop === null || (source === state.source && drop === state.drop)) {
			return;
		}

		this.write({
			...state,
			source,
			drop,
		});
	};

	land(lift: number, onRest: () => void): void {
		const { state } = this;

		if (state === null || state.lift !== lift) {
			onRest();
			return;
		}

		this.onRest = onRest;
		this.write({
			...state,
			isMarked: false,
			isLanding: true,
		});
	}

	rest(lift: number): void {
		if (this.isShowing(lift)) {
			this.restNow();
		}
	}

	private restNow(): void {
		const onRest = this.onRest;
		this.onRest = () => undefined;

		if (this.state !== null) {
			this.write(null);
		}

		onRest();
	}

	private write(state: DragPreviewState | null): void {
		this.state = state;
		this.listeners.forEach((listener) => listener());
	}
}
