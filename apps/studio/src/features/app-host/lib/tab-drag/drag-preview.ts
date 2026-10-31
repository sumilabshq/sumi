import type { TabDrop, TabsSidebar } from "@widgetarium/app-host";
import { arrangedSidebar } from "./arranged-sidebar.js";
import { arrangementKeyOf } from "./arrangement-key.js";
import { isSameDrop } from "./drop-aim.js";
import type { DragSource } from "./drag-source.js";
import { sourceSpotOf } from "./source-spot.js";

export interface DragPreviewState {
	readonly lift: number;
	readonly source: DragSource;
	readonly drop: TabDrop;
	readonly isMarked: boolean;
	readonly isLanding: boolean;
}

const LANDING_MOST_MS = 1500;

export class DragPreview {
	private state: DragPreviewState | null = null;
	private readonly listeners = new Set<() => void>();
	private lifts = 0;
	private heardSidebar: TabsSidebar | null = null;
	private isGlided = false;
	private isCommitted = false;
	private spotAtLanding: string | null = null;
	private landingTimer = 0;
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

	land(lift: number, onRest: () => void): void {
		const { state } = this;

		if (state === null || state.lift !== lift) {
			onRest();
			return;
		}

		this.armLanding(state.source.id, onRest);
		this.write({
			...state,
			isMarked: false,
			isLanding: true,
		});
	}

	glided(lift: number): void {
		if (!this.isShowing(lift)) {
			return;
		}

		this.isGlided = true;
		this.restIfPlaced();
	}

	committed(lift: number): void {
		if (!this.isShowing(lift)) {
			return;
		}

		this.isCommitted = true;
		this.restIfPlaced();
	}

	heard(sidebar: TabsSidebar): void {
		this.heardSidebar = sidebar;
		this.restIfPlaced();
	}

	rest(lift: number): void {
		if (this.isShowing(lift)) {
			this.restNow();
		}
	}

	private restNow(): void {
		window.clearTimeout(this.landingTimer);
		const onRest = this.onRest;
		this.onRest = () => undefined;

		if (this.state !== null) {
			this.write(null);
		}

		onRest();
	}

	private armLanding(sourceId: string, onRest: () => void): void {
		this.onRest = onRest;
		this.isGlided = false;
		this.isCommitted = false;
		this.spotAtLanding = this.heardSidebar === null ? null : sourceSpotOf(this.heardSidebar, sourceId);
		this.landingTimer = window.setTimeout(() => this.restLate(), LANDING_MOST_MS);
	}

	private restIfPlaced(): void {
		const { state, heardSidebar } = this;

		if (state === null || !state.isLanding || !this.isGlided || heardSidebar === null) {
			return;
		}

		const isAnswered = this.isCommitted && sourceSpotOf(heardSidebar, state.source.id) !== this.spotAtLanding;
		const isShown = arrangementKeyOf(arrangedSidebar(heardSidebar, state)) === arrangementKeyOf(heardSidebar);

		if (isAnswered || isShown) {
			this.restNow();
		}
	}

	private restLate(): void {
		console.info(
			`[widgetarium] tab drag of ${this.state?.source.id ?? ""} landing → resting (the sidebar did not show the drop in ${LANDING_MOST_MS} ms)`,
		);
		this.restNow();
	}

	private write(state: DragPreviewState | null): void {
		this.state = state;
		this.listeners.forEach((listener) => listener());
	}
}
