import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { CanvasPagesSchema } from "../schemas/canvas-page.schema.js";
import { PageAskSchema } from "../schemas/canvas-view.schema.js";
import { PageTabs } from "../ui/page-tabs/page-tabs.js";

export const pageTabsInject = inject({
	pagesQuery: IQuery.output(CanvasPagesSchema.nullable().default(null)),
	showPageCommand: ICommand.input(PageAskSchema),
	returnToViewCommand: ICommand,
});

export const PageTabsWidget = widget().inject(pageTabsInject).render(PageTabs);
