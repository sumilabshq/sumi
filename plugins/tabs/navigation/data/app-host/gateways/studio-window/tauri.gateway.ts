import { placesWindowOf } from "@widgetarium/behaviors";
import type { StudioWindow } from "@widgetarium/behaviors";
import type { PaneView } from "../../shared/schema/pane-board.schema.js";
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

	override boot(): PaneView | null {
		const { bootTab, bootChat } = this.studioWindow;

		if (bootChat !== null) {
			return {
				kind: "chat",
				chatId: bootChat,
			};
		}

		return bootTab === null
			? null
			: {
					kind: "app",
					tabId: bootTab,
				};
	}

	override opensBesideAnother(): boolean {
		return !this.studioWindow.isMain;
	}

	override keepsPagesAcrossStarts(): boolean {
		return !this.studioWindow.isMain;
	}
}
