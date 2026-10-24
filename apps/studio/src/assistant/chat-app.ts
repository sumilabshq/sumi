import { AssistantModule } from "@widgetarium/assistant/module";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { app } from "@widgetarium/core/requests";
import type { Platform, PlatformModule, StartedApp } from "@widgetarium/core/requests";
import { MascotModule } from "@widgetarium/mascot/module";

export type AssistantHostObjects =
	typeof AssistantModule extends PlatformModule<infer _Parts, infer _Runs, infer Lent> ? Lent : never;

export interface ChatAppAsk {
	readonly state: StudioState;
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly host: AssistantHostObjects;
}

// TRADE-OFF: kept by studio state, because the band's widgets draw in their own roots where no AppProvider reaches
const CHAT_APPS = new WeakMap<StudioState, StartedApp>();

export function chatAppOf({ state, platform, workspaceId, host }: ChatAppAsk): StartedApp {
	const chatApp = app().modules(MascotModule, AssistantModule).start({
		platform,
		scope: {
			workspaceId,
		},
		host,
	});
	CHAT_APPS.set(state, chatApp);
	return chatApp;
}

export function chatAppFor(state: StudioState): StartedApp | null {
	return CHAT_APPS.get(state) ?? null;
}
