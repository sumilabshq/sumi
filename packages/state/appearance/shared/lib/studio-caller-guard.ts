import { deny, guard } from "@widgetarium/data-framework";

const NOT_FOR_APPS = "only Sumi itself chooses its look; an app reads it";
const SETTINGS_APP = "settings";

export const StudioCallerGuard = guard().handle(({ context }) => {
	if (context.user !== null && context.user.id !== SETTINGS_APP) {
		deny(NOT_FOR_APPS);
	}
});
