import type { PaneView } from "../../shared/schema/pane-board.schema.js";

export abstract class StudioWindowGateway {
	abstract boot(): PaneView | null;
	abstract placesWindow(): string;
	abstract opensBesideAnother(): boolean;
	abstract keepsPagesAcrossStarts(): boolean;
}
