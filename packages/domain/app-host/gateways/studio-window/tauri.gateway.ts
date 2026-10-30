import type { StudioWindow } from "@widgetarium/behaviors";
import { StudioWindowGateway } from "./studio-window.gateway.js";

export class TauriStudioWindowGateway extends StudioWindowGateway {
	constructor(private readonly studioWindow: StudioWindow) {
		super();
	}

	override windowLabel(): string {
		return this.studioWindow.label;
	}

	override opensBesideAnother(): boolean {
		return !this.studioWindow.isMain;
	}

	override keepsPagesAcrossStarts(): boolean {
		return !this.studioWindow.isMain;
	}
}
