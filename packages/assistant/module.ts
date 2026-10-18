import { clientModule } from "@widgetarium/core/requests";
import type { AssistantParts } from "./gateways/assistant-parts/assistant-parts.gateway.js";

export const AssistantClientModule = clientModule("assistant").provide((parts: AssistantParts) => ({ ...parts }));
