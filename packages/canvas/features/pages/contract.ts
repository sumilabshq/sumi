import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { PageInputSchema, PageOf } from "@widgetarium/core/gateway/page.js";

export const FinishFlightCommand = command("canvas/finish-flight").idempotencyKey(Repeatable);

export const FocusWidgetCommand = command("canvas/focus-widget")
	.input(z.object({ widget: z.string() }))
	.idempotencyKey(Repeatable);

export const PageTabsQuery = query("canvas/page-tabs").output(
	z.object({
		tabs: z.array(z.object({ name: z.string(), opens: z.string() })).readonly(),
		shown: z.string(),
	}),
);

export const PageTitleQuery = query("canvas/page-title").output(
	z.object({ page: z.string(), states: z.number().nullable() }),
);

export const PagesQuery = query("canvas/pages")
	.input(PageInputSchema)
	.output(PageOf(z.object({ page: z.string(), isRunning: z.boolean(), isShown: z.boolean() })));

export const PickVariantCommand = command("canvas/pick-variant")
	.input(z.object({ screen: z.string() }))
	.idempotencyKey(Repeatable);

export const ReturnToViewCommand = command("canvas/return-to-view").idempotencyKey(Repeatable);

export const ShowPageCommand = command("canvas/show-page")
	.input(z.object({ page: z.string() }))
	.idempotencyKey(Repeatable);

export const VariantsQuery = query("canvas/variants").output(
	z.object({
		isShown: z.boolean(),
		shown: z.string(),
		items: z.array(z.object({ value: z.string(), label: z.string() })),
	}),
);
