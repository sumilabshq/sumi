import { IQuery, inject, widget } from "@widgetarium/core";
import { ReadDesignSchema } from "../schemas/design.schema.js";
import { DesignSummary } from "../ui/design-summary/design-summary.js";

export const designSummaryInject = inject({
	designQuery: IQuery.output(ReadDesignSchema.nullable().default(null)),
});

export const DesignSummaryWidget = widget().inject(designSummaryInject).render(DesignSummary);
