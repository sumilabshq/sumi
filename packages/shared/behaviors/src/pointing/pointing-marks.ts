import type { Box } from "@widgetarium/gpu";

export interface PointingMarks {
	readonly frame: string;
	readonly screen: string;
	readonly liveScreen: string;
	readonly chrome: string;
}

export interface Spot {
	readonly mark: string;
	readonly screen: Box;
	readonly target: Box;
	readonly radius: number;
}

export interface PointedPick {
	readonly widget: string;
	readonly mark: string;
	readonly spot: Spot;
}
