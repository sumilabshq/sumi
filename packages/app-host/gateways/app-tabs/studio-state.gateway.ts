import type { StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import type { AppTab } from "../../shared/schema/app-tab.schema.js";
import { AppTabsGateway } from "./app-tabs.gateway.js";

const STUDIO_APPS: readonly (AppTab & { readonly view: StudioView })[] = [
	{
		id: "canvas",
		label: "Canvas",
		icon: "pen-tool",
		view: "canvas",
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
		const app = STUDIO_APPS.find((held) => held.id === id);

		if (!app) {
			throw new Error(NOT_AN_APP.replace("{id}", id));
		}

		this.studioState.show(app.view);
	}

	closePanel(): void {
		this.studioState.show(APP_VIEW);
	}
}
