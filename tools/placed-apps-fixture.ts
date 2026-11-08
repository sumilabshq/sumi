import { ListedPlacedAppsGateway } from "../plugins/apps/data/places/gateways/placed-apps/listed.gateway.ts";
import { placedAppsOf } from "../plugins/apps/data/places/shared/lib/tabs/app-abilities.ts";
import { placedAppOf } from "../plugins/apps/src/features/app-tab/lib/placed-app-of.ts";
import { AppSchema, apps } from "../plugins/apps/src/index.ts";
import { chat } from "../plugins/chat/src/index.ts";
import { main } from "../plugins/main/src/index.ts";

export const BUILT_IN_PLACED_APPS = [main, chat].flatMap((filler) =>
	filler.parts.fills
		.flatMap(({ slot, listId, item }) => (slot === apps.apps && listId !== null ? [{ id: listId, item }] : []))
		.map(({ id, item }) => placedAppOf({ id, ...AppSchema.parse(item) })),
);

export const BUILT_IN_APPS = placedAppsOf(BUILT_IN_PLACED_APPS);

export function builtInPlacedApps(): ListedPlacedAppsGateway {
	return new ListedPlacedAppsGateway(BUILT_IN_PLACED_APPS);
}
