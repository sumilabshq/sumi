import { MAIN_STUDIO_WINDOW } from "@widgetarium/behaviors";
import { HomeGateway } from "./home.gateway.js";

export class MainHomeGateway extends HomeGateway {
	override mainWindow(): string {
		return MAIN_STUDIO_WINDOW;
	}
}
