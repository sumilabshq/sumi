import { ListedPlacedAppsGateway } from "../plugins/apps/data/places/gateways/placed-apps/listed.gateway.ts";
import { placedAppsOf } from "../plugins/apps/data/places/shared/lib/tabs/app-abilities.ts";
import { placedAppOf } from "../plugins/apps/src/features/app-tab/lib/placed-app-of.ts";
import { AppSchema, AppsSlot } from "../plugins/apps/src/slots.ts";
import { ChatPlugin } from "../plugins/chat/src/plugin.ts";
import { MainPlugin } from "../plugins/main/src/plugin.ts";

export const BUILT_IN_PLACED_APPS = [MainPlugin, ChatPlugin].flatMap((filler) =>
	filler.parts.fills
		.filter(({ slot }) => slot === AppsSlot)
		.map(({ id, item }) => placedAppOf({ id, ...AppSchema.parse(item) })),
);

export const BUILT_IN_APPS = placedAppsOf(BUILT_IN_PLACED_APPS);

export function builtInPlacedApps(): ListedPlacedAppsGateway {
	return new ListedPlacedAppsGateway(BUILT_IN_PLACED_APPS);
}
