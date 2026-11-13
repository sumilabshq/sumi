import { ListedPlacedAppsGateway } from "../plugins/apps/data/places/gateways/placed-apps/listed.gateway.ts";
import { placedAppsOf } from "../plugins/apps/data/places/shared/lib/tabs/app-abilities.ts";
import { placedAppOf } from "../plugins/apps/src/features/app-tab/lib/placed-app-of.ts";
import { appsFilledBy } from "./apps-filled-fixture.ts";
import { chat } from "../plugins/ai/chat/src/index.ts";
import { main } from "../plugins/main/src/index.ts";
import { agent } from "../plugins/ai/agent/src/index.ts";
import { tasks } from "../plugins/tasks/src/index.ts";

export const BUILT_IN_PLACED_APPS = appsFilledBy([main, chat, agent, tasks]).map(placedAppOf);

export const BUILT_IN_APPS = placedAppsOf(BUILT_IN_PLACED_APPS);

export function builtInPlacedApps(): ListedPlacedAppsGateway {
	return new ListedPlacedAppsGateway(BUILT_IN_PLACED_APPS);
}
