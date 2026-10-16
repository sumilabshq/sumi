export interface StageLook {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}

export interface StageSize {
	readonly width: number;
	readonly height: number;
}

export interface StagePoint {
	readonly x: number;
	readonly y: number;
}

export type LookWatcher = (look: StageLook) => void;

const ZOOM_FLOOR = 0.1;
const ZOOM_CEILING = 2;
const PINCH_RATE = 0.012;
const WHEEL_RATE = 0.003;
const PINCH_DELTA_BELOW = 30;

export function fitLook(field: StageSize, view: StageSize): StageLook {
	const scale = Math.max(ZOOM_FLOOR, Math.min(1, view.width / field.width, view.height / field.height));
	return { scale, x: (view.width - field.width * scale) / 2, y: (view.height - field.height * scale) / 2 };
}

export function wheeled(look: StageLook, event: WheelEvent, at: StagePoint): StageLook {
	if (!event.ctrlKey && !event.metaKey) return { ...look, x: look.x - event.deltaX, y: look.y - event.deltaY };
	const rate = Math.abs(event.deltaY) < PINCH_DELTA_BELOW ? PINCH_RATE : WHEEL_RATE;
	return scaledAround(look, look.scale * Math.exp(-event.deltaY * rate), at);
}

function scaledAround(look: StageLook, wanted: number, at: StagePoint): StageLook {
	const scale = Math.max(ZOOM_FLOOR, Math.min(wanted, ZOOM_CEILING));
	return { scale, x: at.x - ((at.x - look.x) * scale) / look.scale, y: at.y - ((at.y - look.y) * scale) / look.scale };
}
