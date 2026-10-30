import { event, tauriEvent } from "@widgetarium/core/requests";

const STUDIO_CORE_CHANGED = "studio-core-changed";

export const TabsSettledEvent = event("tabs-settled");

export const StudioCoreChangedEvent = event("studio-core-changed").from({ tauri: tauriEvent(STUDIO_CORE_CHANGED) });
