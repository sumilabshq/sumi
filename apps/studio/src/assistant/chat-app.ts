import { AssistantClientModule } from "@widgetarium/assistant/module";
import { assistantPartsOf } from "@widgetarium/assistant/gateways";
import type { AssistantGateways } from "@widgetarium/assistant/gateways";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { app } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { MascotClientModule } from "@widgetarium/mascot/module";
import type { MascotParts } from "@widgetarium/mascot/gateways";

export interface ChatAppAsk {
	readonly state: StudioState;
	readonly mascot: MascotParts;
	readonly gateways: AssistantGateways;
}

// TRADE-OFF: kept by studio state, because the band's widgets draw in their own roots where no AppProvider reaches
const CHAT_APPS = new WeakMap<StudioState, StartedApp>();

export function chatAppOf({ state, mascot, gateways }: ChatAppAsk): StartedApp {
	const chatApp = app({
		modules: [MascotClientModule.with(mascot), AssistantClientModule.with(assistantPartsOf(gateways))],
	});
	CHAT_APPS.set(state, chatApp);
	return chatApp;
}

export function chatAppFor(state: StudioState): StartedApp | null {
	return CHAT_APPS.get(state) ?? null;
}
