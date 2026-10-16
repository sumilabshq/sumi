import { handler, refuse } from "@widgetarium/core/requests";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { noteToReturnTo } from "./lib/note-to-return-to.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { pagesStill } from "../../shared/lib/pages/pages-still.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { COMPONENTS_PAGE, PAGES_TAB } from "../../shared/schema/canvas-page.schema.js";
import {
	DesignSummaryQuery,
	FinishFlightCommand,
	FocusWidgetCommand,
	PageTabsQuery,
	PickVariantCommand,
	ReturnToViewCommand,
	ShowPageCommand,
	VariantsQuery,
} from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const SPEC_REFUSED = "The spec of {app} cannot be read: {why}";
const PICKED = "Picked";

export const DesignSummaryQueryHandler = handler(DesignSummaryQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => designReads.watch(canvasStore.now().app, changed))
	.handle(async (_input, { designReads, canvasStore }) => {
		const { app } = canvasStore.now();
		const { screens } = await designReads.design(app);
		const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
		return { app, said: SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames)) };
	});

export const FinishFlightCommandHandler = handler(FinishFlightCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => canvasStore.change({ focusedWidget: null }, "flown to the widget"));

export const FocusWidgetCommandHandler = handler(FocusWidgetCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ widget }, { canvasStore }) =>
		canvasStore.change({ page: COMPONENTS_PAGE, focusedWidget: widget }, `open ${widget}`),
	);

export const PageTabsQueryHandler = handler(PageTabsQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async (_input, { designReads, canvasStore }) => {
		const { pages } = await pagesNow(designReads, canvasStore);
		return {
			leading: [...pages.leading],
			pages: pages.screens.map((page) => ({ page, isRunning: page in pages.running, isShown: page === pages.shown })),
			trailing: [...pages.trailing],
			shown: pages.shown,
			shownTab: pages.screens.includes(pages.shown) ? PAGES_TAB : pages.shown,
		};
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
	.handle(({ page }, { canvasStore }) => canvasStore.change({ page }, `show ${page}`));

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
