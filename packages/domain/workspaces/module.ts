import { clientModule } from "@widgetarium/core/requests";
import type { WorkspacesParts } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";

export const WorkspacesClientModule = clientModule("workspaces").provide((parts: WorkspacesParts) => ({ ...parts }));
