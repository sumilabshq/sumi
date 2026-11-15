import { placesWindowOf } from "@widgetarium/behaviors";
import type { StudioWindow } from "@widgetarium/behaviors";
import { StudioWindowGateway } from "./studio-window.gateway.js";

export class TauriStudioWindowGateway extends StudioWindowGateway {
	constructor(
		private readonly studioWindow: StudioWindow,
		private readonly workspaceId: string,
	) {
		super();
	}

	override placesWindow(): string {
		return placesWindowOf(this.studioWindow.label, this.workspaceId);
	}

	override opensBesideAnother(): boolean {
		return !this.studioWindow.isMain;
	}

	override keepsPagesAcrossStarts(): boolean {
		return !this.studioWindow.isMain;
	}
}
