import { query } from "#module";
import { AppsSchema } from "../../shared/schema/app.schema.js";

export const all = query()
	.public()
	.output(AppsSchema)
	.handle((_input, { appList }) => ({ apps: appList.apps() }));
