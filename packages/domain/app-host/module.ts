import { clientModule } from "@widgetarium/core/requests";
import type { AppHostParts } from "./gateways/app-host-parts/app-host-parts.gateway.js";

export const AppHostClientModule = clientModule("app-host").provide((parts: AppHostParts) => ({ ...parts }));
