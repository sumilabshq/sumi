import { Notice, Plugin } from "obsidian";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { corePack } from "@widgetarium/pack-core";
import { gitPack } from "@widgetarium/pack-git";
import { obsidianPack } from "@widgetarium/pack-obsidian";
import { statsPack } from "@widgetarium/pack-stats";
import { cataloguePack } from "@widgetarium/pack-catalogue";
import { createAssistant } from "./legacy/ai/assistant.js";
import type { Assistant } from "./legacy/ai/assistant.js";
import { obsidianAssistantPort } from "./legacy/ai/assistant-port-obsidian.js";
import type { ObsidianAssistantPort } from "./legacy/ai/assistant-port-obsidian.js";
import { createHost } from "./legacy/host.js";
import type { ObsidianHost } from "./legacy/host.js";
import { registerDesignView } from "./legacy/design-view.js";
import { answerShotRequests } from "./legacy/shot-requests.js";
import { addCommands } from "./commands.js";
import { WidgetariumSettingTab } from "./settings-tab.js";
import { registerStudio } from "./studio.js";
import { startVaultWidgets } from "./vault-widgets.js";
import type { WantedWidgets } from "./vault-widgets.js";

const CONVERSATION_NOT_RESTORED = "Widgetarium: the last conversation could not be read back — the console says why";

export class WidgetariumPlugin extends Plugin {
	// TRADE-OFF: declared rather than built here, because the vault is read only once Obsidian calls onload
	declare registry: WidgetRegistry;
	declare wanted: WantedWidgets;
	declare started: Promise<void>;
	declare host: ObsidianHost;
	declare assistant: Assistant;
	declare assistantPort: ObsidianAssistantPort;

	override async onload(): Promise<void> {
		registerPacks(corePack, obsidianPack, statsPack, gitPack, cataloguePack);
		const widgets = startVaultWidgets(this);
		this.registry = widgets.registry;
		this.wanted = widgets.wanted;
		this.started = widgets.started;
		this.host = createHost(this.app, this);
		this.startAssistant();
		registerStudio(this, this.assistantPort);
		registerDesignView(this);
		addCommands(this);
		void this.started.then(() => answerShotRequests(this));
	}

	redrawAssistant(): void {
		this.assistantPort.setupChanged();
	}

	override onunload(): void {
		this.assistant.close();
	}

	private startAssistant(): void {
		this.assistant = createAssistant(this.app, this);
		this.assistantPort = obsidianAssistantPort(this.assistant);
		this.addSettingTab(new WidgetariumSettingTab(this.app, this, this.assistant));
		this.assistant.restore().catch((failure: unknown) => {
			console.error("[widgetarium] the last conversation could not be read back", failure);
			new Notice(CONVERSATION_NOT_RESTORED);
		});
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.redrawAssistant()));
	}
}

export default WidgetariumPlugin;
