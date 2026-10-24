import { clientModule } from "@widgetarium/core/requests";
import type { MascotParts } from "./gateways/mascot-parts/mascot-parts.gateway.js";

export const MascotClientModule = clientModule("mascot").provide((parts: MascotParts) => ({ ...parts }));
