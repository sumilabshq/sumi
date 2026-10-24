import { query } from "@widgetarium/core/requests";
import { PageHeadSchema } from "../../shared/schema/page-look.schema.js";

export const PageHeadQuery = query("browser/page-head").output(PageHeadSchema.nullable()).settlesNow();
