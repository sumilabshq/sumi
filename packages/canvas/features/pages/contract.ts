import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";

export const DesignSummaryQuery = query("canvas/design-summary").output(
	z.object({ app: z.string(), said: z.string() }),
);

export const FinishFlightCommand = command("canvas/finish-flight").idempotencyKey(Repeatable);

export const FocusWidgetCommand = command("canvas/focus-widget")
	.input(z.object({ widget: z.string() }))
	.idempotencyKey(Repeatable);

export const PageTabsQuery = query("canvas/page-tabs").output(
	z.object({
		leading: z.array(z.string()),
		pages: z.array(z.object({ page: z.string(), isRunning: z.boolean(), isShown: z.boolean() })),
		trailing: z.array(z.string()),
		shown: z.string(),
		shownTab: z.string(),
	}),
);

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
