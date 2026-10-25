export type PlateHeaderPlace = "lead" | "crumb" | "controls";

export type PlateHeaderTargets = Readonly<Record<PlateHeaderPlace, HTMLElement | null>>;

export interface PlateLook {
	readonly fill: string;
}

interface PaintedLook {
	readonly owner: object;
	readonly look: PlateLook;
}

const NO_TARGETS: PlateHeaderTargets = {
	lead: null,
	crumb: null,
	controls: null,
};

export class PlateHeaderStore {
	private targets: PlateHeaderTargets = NO_TARGETS;
	private painted: PaintedLook | null = null;
	private readonly targetWatchers = new Set<() => void>();
	private readonly lookWatchers = new Set<() => void>();

	constructor(private readonly plate: string) {}

	targetsNow = (): PlateHeaderTargets => this.targets;

	watchTargets = (changed: () => void): (() => void) => {
		this.targetWatchers.add(changed);
		return () => void this.targetWatchers.delete(changed);
	};

	lookNow = (): PlateLook | null => this.painted?.look ?? null;

	watchLook = (changed: () => void): (() => void) => {
		this.lookWatchers.add(changed);
		return () => void this.lookWatchers.delete(changed);
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

	paint(owner: object, look: PlateLook | null): void {
		const was = this.painted;
		if (look === null && was?.owner !== owner) {
			return;
		}

		const isSame = isSameLook(this.lookNow(), look);
		this.painted = look === null ? null : { owner, look };
		if (isSame) {
			return;
		}

		console.debug(`[widgetarium] ${this.plate} plate look ${lookText(was)} → ${lookText(this.painted)}`);
		this.lookWatchers.forEach((changed) => changed());
	}
}

function isSameLook(left: PlateLook | null, right: PlateLook | null): boolean {
	return left?.fill === right?.fill;
}

function lookText(painted: PaintedLook | null): string {
	if (painted === null) {
		return "plate";
	}

	return painted.look.fill;
}
