import { clientModule } from "@widgetarium/core/requests";
import type { BrowserParts } from "./gateways/browser-parts/browser-parts.gateway.js";

export const BrowserClientModule = clientModule("browser").provide((parts: BrowserParts) => ({ ...parts }));
