import type { StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import type { AppTab } from "../../shared/schema/app-tab.schema.js";
import { AppTabsGateway } from "./app-tabs.gateway.js";

const STUDIO_APPS: readonly AppTab[] = [
	{
		id: "canvas",
		label: "Canvas",
		icon: "pen-tool",
	},
];

const APP_VIEW: StudioView = "app";

const NOT_AN_APP = 'the studio holds no app "{id}"';

export class StudioStateAppTabsGateway extends AppTabsGateway {
	constructor(private readonly studioState: StudioState) {
		super();
	}

	tabs(): readonly AppTab[] {
		return STUDIO_APPS;
	}

	shownId(): string {
		return this.studioState.now().view;
	}

	watch(changed: () => void): () => void {
		return this.studioState.subscribe(changed);
	}

	show(id: string): void {
		this.studioState.show(studioViewOf(id));
	}

	closePanel(): void {
		this.studioState.show(APP_VIEW);
	}
}

function studioViewOf(id: string): StudioView {
	if (id === "canvas" || id === "app") {
		return id;
	}

	throw new Error(NOT_AN_APP.replace("{id}", id));
}
