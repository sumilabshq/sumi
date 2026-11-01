export type PlateHeaderPlace = "controls";

export type PlateHeaderTargets = Readonly<Record<PlateHeaderPlace, HTMLElement | null>>;

const NO_TARGETS: PlateHeaderTargets = {
	controls: null,
};

export class PlateHeaderStore {
	private targets: PlateHeaderTargets = NO_TARGETS;
	private readonly targetWatchers = new Set<() => void>();

	targetsNow = (): PlateHeaderTargets => this.targets;

	watchTargets = (changed: () => void): (() => void) => {
		this.targetWatchers.add(changed);
		return () => void this.targetWatchers.delete(changed);
	};

	placeTarget(place: PlateHeaderPlace, element: HTMLElement | null): void {
		if (this.targets[place] === element) {
			return;
		}

		this.targets = {
			...this.targets,
			[place]: element,
		};
		this.targetWatchers.forEach((changed) => changed());
	}
}
