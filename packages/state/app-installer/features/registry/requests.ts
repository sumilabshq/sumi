import { query } from "@widgetarium/core/requests";
import { AppsGateway } from "../../gateways/apps/apps.gateway.js";
import { AppRegistrySchema } from "../../shared/schema/registry.schema.js";

export const AppRegistryQuery = query("app-registry")
	.output(AppRegistrySchema)
	.inject({ apps: AppsGateway })
	.handle((_input, { apps }) => apps.readRegistry());
