import { MAIN_STUDIO_WINDOW, placesWindowOf } from "@widgetarium/behaviors";
import { HomeGateway } from "./home.gateway.js";

export class WorkspaceHomeGateway extends HomeGateway {
	constructor(private readonly workspaceId: string) {
		super();
	}

	override mainWindow(): string {
		return placesWindowOf(MAIN_STUDIO_WINDOW, this.workspaceId);
	}
}
