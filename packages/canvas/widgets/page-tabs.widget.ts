import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { PageAskSchema } from "../schemas/canvas-view.schema.js";
import { PageTabs } from "../ui/page-tabs/page-tabs.js";

export const pageTabsInject = inject({
	getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	showPage: ICommand.input(PageAskSchema),
	returnToView: ICommand,
});

export const PageTabsWidget = widget().inject(pageTabsInject).render(PageTabs);
