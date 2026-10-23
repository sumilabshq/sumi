import { clientModule } from "@widgetarium/core/requests";
import type { ShellParts } from "./gateways/shell-parts/shell-parts.gateway.js";

export const ShellClientModule = clientModule("shell").provide((parts: ShellParts) => ({ ...parts }));
