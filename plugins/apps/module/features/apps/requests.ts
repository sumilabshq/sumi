import { query } from "@widgetarium/data-framework";
import { AppListGateway } from "../../gateways/app-list/app-list.gateway.js";
import { AppsSchema } from "../../shared/schema/app.schema.js";

export const AppsQuery = query("apps")
	.output(AppsSchema)
	.inject({ appList: AppListGateway })
	.handle((_input, { appList }) => ({ apps: appList.apps() }));
