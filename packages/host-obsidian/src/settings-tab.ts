import { Notice, PluginSettingTab, Setting } from "obsidian";
import type { App, Plugin } from "obsidian";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { Assistant } from "./legacy/ai/assistant.js";
import { PUBLISH_WIDGETS, SKIP_PERMISSIONS } from "./legacy/ai/switches.js";

interface ObsidianSettings {
	open(): void;
	openTabById(id: string): void;
}

interface SwitchText {
	readonly label: string;
	readonly hint: string;
}

const HEADING = "Artificial intelligence";
const PROVIDER_NAME = "Provider";
const PROVIDER_DESC = "Which local agent the studio's AI panel talks to. Every one of them runs on this machine.";
const CONFIGURE = "Configure providers";
const READY = "{label} is ready.";
const NOT_READY = "{label}: {reason}";
const NOT_READY_UNSAID = "{label} is not ready, and it did not say why.";
const NOT_DRAWN_NAME = "These settings could not be shown";
const NOT_DRAWN = "Reading them failed: {why}";
const NOT_SAVED = 'Widgetarium: "{setting}" was not saved: {why}';
const SETTINGS_UNREACHABLE = "Widgetarium: Obsidian's settings window cannot be opened from this version.";

export class WidgetariumSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly assistant: Assistant,
	) {
		super(app, plugin);
	}

	override display(): void {
		this.containerEl.empty();
		this.draw().catch((failure: unknown) => {
			console.error("[widgetarium] settings tab → not drawn", failure);
			new Setting(this.containerEl)
				.setName(NOT_DRAWN_NAME)
				.setDesc(NOT_DRAWN.replace("{why}", failureMessage(failure)));
		});
	}

	private async draw(): Promise<void> {
		const holder = this.containerEl;
		const { assistant } = this;
		const ai = await assistant.state();
		new Setting(holder).setName(HEADING).setHeading();
		new Setting(holder)
			.setName(PROVIDER_NAME)
			.setDesc(`${PROVIDER_DESC} ${readinessSaid(ai.ready, ai.reason).replace("{label}", ai.provider.label)}`)
			.addButton((button) =>
				button
					.setButtonText(CONFIGURE)
					.setCta()
					.onClick(() => assistant.openProviders()),
			);
		addSwitch(holder, SKIP_PERMISSIONS, ai.skipPermissions, (on) => assistant.settings.setSkipPermissions(on));
		addSwitch(holder, PUBLISH_WIDGETS, ai.publishWidgets, (on) => assistant.settings.setPublishWidgets(on));
	}
}

export function openPluginSettings(app: App, pluginId: string): void {
	const settings: unknown = Reflect.get(app, "setting");
	if (!isObsidianSettings(settings)) {
		console.error("[widgetarium] Obsidian's settings window is not reachable from this version");
		new Notice(SETTINGS_UNREACHABLE);
		return;
	}
	settings.open();
	settings.openTabById(pluginId);
}

function readinessSaid(ready: boolean, reason: string | null): string {
	if (ready) return READY;
	if (!reason) return NOT_READY_UNSAID;
	return NOT_READY.replace("{reason}", reason);
}

function addSwitch(
	holder: HTMLElement,
	text: SwitchText,
	isOn: boolean,
	write: (on: boolean) => Promise<unknown>,
): void {
	new Setting(holder)
		.setName(text.label)
		.setDesc(text.hint)
		.addToggle((toggle) => {
			let isReverting = false;
			toggle.setValue(isOn).onChange((on) => {
				if (isReverting) return;
				write(on).catch((failure: unknown) => {
					console.error(`[widgetarium] ${text.label} → not saved as ${on ? "on" : "off"}`, failure);
					new Notice(NOT_SAVED.replace("{setting}", text.label).replace("{why}", failureMessage(failure)));
					isReverting = true;
					toggle.setValue(!on);
					isReverting = false;
				});
			});
		});
}

// TRADE-OFF: app.setting is not in Obsidian's typed API, so it is checked before use
function isObsidianSettings(held: unknown): held is ObsidianSettings {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof Reflect.get(held, "open") === "function" &&
		typeof Reflect.get(held, "openTabById") === "function"
	);
}
