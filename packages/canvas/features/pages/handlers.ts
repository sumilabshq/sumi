import { handler, refuse } from "@widgetarium/core/requests";
import { offsetOfCursor, pageAt } from "@widgetarium/core/gateway/page.js";
import { CanvasHost } from "../../gateways/canvas-host/canvas-host.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { noteToReturnTo } from "./lib/note-to-return-to.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { pagesStill } from "../../shared/lib/pages/pages-still.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { COMPONENTS_PAGE } from "../../shared/schema/canvas-page.schema.js";
import {
	AppNameQuery,
	FinishFlightCommand,
	FocusWidgetCommand,
	PageTabsQuery,
	PagesQuery,
	PickVariantCommand,
	ReturnToViewCommand,
	ShowPageCommand,
	VariantsQuery,
} from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const SPEC_REFUSED = "The spec of {app} cannot be read: {why}";
const PICKED = "Picked";

export const AppNameQueryHandler = handler(AppNameQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => ({ app: canvasStore.now().app }));

export const FinishFlightCommandHandler = handler(FinishFlightCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => {
		canvasStore.change({ focusedWidget: null }, "flown to the widget");
	});

export const FocusWidgetCommandHandler = handler(FocusWidgetCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ widget }, { canvasStore }) => {
		canvasStore.changeOpening({ page: COMPONENTS_PAGE, focusedWidget: widget }, `open ${widget}`);
	});

export const PageTabsQueryHandler = handler(PageTabsQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async (_input, { designReads, canvasStore }) => {
		const { pages } = await pagesNow(designReads, canvasStore);
		return { tabs: [...pages.leading, ...pages.trailing], shown: pages.shown };
	});

export const PagesQueryHandler = handler(PagesQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async ({ cursor, limit }, { designReads, canvasStore }) => {
		const { pages } = await pagesNow(designReads, canvasStore);
		const offset = offsetOfCursor(cursor);
		const listed = pages.screens.slice(offset, offset + limit);
		const rows = listed.map((page) => ({ page, isRunning: page in pages.running, isShown: page === pages.shown }));
		return pageAt(rows, offset, pages.screens.length);
	});

export const PickVariantCommandHandler = handler(PickVariantCommand, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.handle(async ({ screen }, { designReads, canvasStore }) => {
		const now = await pagesStill(designReads, canvasStore, `show ${screen}`);
		if (!now) return;
		const { shown } = now.pages;
		const variants = { ...canvasStore.now().variants, [shown]: screen };
		canvasStore.change({ variants }, `show ${screen} on ${shown}`);
	});

export const ReturnToViewCommandHandler = handler(ReturnToViewCommand, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore, canvasHost: CanvasHost })
	.handle(async (_input, { designReads, canvasStore, canvasHost }) => {
		const { returnTo } = canvasHost;
		if (returnTo.kind === "view") return returnTo.open();
		const { app, pages } = await pagesNow(designReads, canvasStore);
		const read = await designReads.spec(app);
		if (read?.refusal !== undefined) return refuse(SPEC_REFUSED.replace("{app}", app).replace("{why}", read.refusal));
		await returnTo.open(noteToReturnTo(read?.spec.pages ?? [], pages.shown, canvasHost.cameFrom()));
	});

export const ShowPageCommandHandler = handler(ShowPageCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ page }, { canvasStore }) => {
		canvasStore.changeOpening({ page }, `show ${page}`);
	});

export const VariantsQueryHandler = handler(VariantsQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async (_input, { designReads, canvasStore }) => {
		const { pages } = await pagesNow(designReads, canvasStore);
		return {
			isShown: pages.variants.length >= 2,
			shown: pages.shownScreen ?? "",
			items: pages.variants.map(({ screen, letter }) => ({ value: screen, label: letter ?? PICKED })),
		};
	});
