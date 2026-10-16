import { SuggestModal } from "obsidian";
import type { App } from "obsidian";
import type { HostApp } from "@widgetarium/core/engine/studio-host.js";

const PLACEHOLDER = "Open an app";
const NO_APPS = "No folder in this vault holds a widgetarium.json";
const PAGES = "{pages} pages";

export class OpenAppModal extends SuggestModal<HostApp> {
	constructor(
		app: App,
		private readonly apps: readonly HostApp[],
		private readonly openPicked: (picked: HostApp) => void,
	) {
		super(app);
		this.setPlaceholder(PLACEHOLDER);
		this.emptyStateText = NO_APPS;
	}

	getSuggestions(query: string): HostApp[] {
		const asked = query.trim().toLowerCase();
		return this.apps.filter((held) => `${held.name} ${held.id}`.toLowerCase().includes(asked));
	}

	renderSuggestion(held: HostApp, element: HTMLElement): void {
		element.createDiv({ text: held.name });
		element.createEl("small", { text: held.refusal ?? `${held.id} · ${PAGES.replace("{pages}", String(held.pages))}` });
	}

	onChooseSuggestion(picked: HostApp): void {
		this.openPicked(picked);
	}
}
