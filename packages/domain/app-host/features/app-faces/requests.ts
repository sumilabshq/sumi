import { query } from "@widgetarium/core/requests";
import { AppFacesQuery as PlacedAppFacesQuery } from "@widgetarium/places";
import { AppFacesSchema } from "../../shared/schema/app-tab.schema.js";

export const AppFacesQuery = query("app-faces")
	.output(AppFacesSchema)
	.handle((_input, { send }) => send(PlacedAppFacesQuery));
