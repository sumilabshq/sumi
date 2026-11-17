import type { PaneView } from "../schema/pane-board.schema.js";

export interface SeatedWindow {
	placesWindow(): string;
	boot(): PaneView | null;
}

export interface WindowSeat {
	readonly window: string;
	readonly boot: PaneView | null;
}

export function seatOf(studioWindow: SeatedWindow): WindowSeat {
	return {
		window: studioWindow.placesWindow(),
		boot: studioWindow.boot(),
	};
}
