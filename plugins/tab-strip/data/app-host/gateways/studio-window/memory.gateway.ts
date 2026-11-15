import { MAIN_STUDIO_WINDOW, placesWindowOf } from "@widgetarium/behaviors";
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
	constructor(
		private readonly workspaceId: string,
		private readonly seat: StudioWindowSeat = MAIN_SEAT,
	) {
		super();
	}

	override placesWindow(): string {
		return placesWindowOf(this.seat.label, this.workspaceId);
	}

	override opensBesideAnother(): boolean {
		return this.seat.isBeside;
	}

	override keepsPagesAcrossStarts(): boolean {
		return this.seat.keepsPages;
	}
}
