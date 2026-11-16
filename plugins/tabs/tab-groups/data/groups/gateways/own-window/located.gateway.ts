import { placesWindowOf } from "@widgetarium/behaviors";
import { OwnWindowGateway } from "./own-window.gateway.js";

export class LocatedOwnWindowGateway extends OwnWindowGateway {
	constructor(
		private readonly label: string,
		private readonly workspaceId: string,
	) {
		super();
	}

	override placesWindow(): string {
		return placesWindowOf(this.label, this.workspaceId);
	}
}
