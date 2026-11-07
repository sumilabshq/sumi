import { MAIN_STUDIO_WINDOW } from "@widgetarium/behaviors";
import { StudioWindowGateway } from "./studio-window.gateway.js";

export interface StudioWindowSeat {
	readonly label: string;
	readonly isBeside: boolean;
	readonly keepsPages: boolean;
}

const MAIN_SEAT: StudioWindowSeat = {
	label: MAIN_STUDIO_WINDOW,
	isBeside: false,
	keepsPages: true,
};

export class MemoryStudioWindowGateway extends StudioWindowGateway {
	constructor(private readonly seat: StudioWindowSeat = MAIN_SEAT) {
		super();
	}

	override windowLabel(): string {
		return this.seat.label;
	}

	override opensBesideAnother(): boolean {
		return this.seat.isBeside;
	}

	override keepsPagesAcrossStarts(): boolean {
		return this.seat.keepsPages;
	}
}
