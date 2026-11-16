import { OwnWindowGateway } from "./own-window.gateway.js";

export class FixedOwnWindowGateway extends OwnWindowGateway {
	constructor(private readonly ownPlacesWindow: string) {
		super();
	}

	override placesWindow(): string {
		return this.ownPlacesWindow;
	}
}
