import { event, tauriEvent } from "@widgetarium/core/requests";
import { z } from "zod";

const STUDIO_CORE_CHANGED = "studio-core-changed";

const CoreChangedSchema = z.object({});

export const TabsSettledEvent = event("tabs-settled");

export const StudioCoreChangedEvent = event("studio-core-changed")
	.input(CoreChangedSchema)
	.from({ tauri: tauriEvent(STUDIO_CORE_CHANGED) });
