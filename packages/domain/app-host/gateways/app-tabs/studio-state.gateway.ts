import type { StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import type { AppKind } from "../../shared/schema/app-tab.schema.js";
import { AppTabsGateway } from "./app-tabs.gateway.js";

const APP_VIEW: StudioView = "app";

export class StudioStateAppTabsGateway extends AppTabsGateway {
	constructor(private readonly studioState: StudioState) {
		super();
	}

	shownApp(): AppKind | null {
		const { view } = this.studioState.now();

		if (view === "app") {
			return null;
		}

		return view;
	}

	watch(changed: () => void): () => void {
		return this.studioState.subscribe(changed);
	}

	show(app: AppKind): void {
		this.studioState.show(app);
	}

	closePanel(): void {
		this.studioState.show(APP_VIEW);
	}
}
