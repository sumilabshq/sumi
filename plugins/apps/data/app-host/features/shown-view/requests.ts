import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { ShownViewChangedEvent } from "../../gateways/shown-view/shown-view.events.js";
import { StudioViewSchema } from "../../shared/schema/studio-view.schema.js";

export const ShownViewQuery = query("shown-view")
	.public()
	.output(StudioViewSchema)
	.settlesNow()
	.handle((_input, { shownView }) => shownView.shownView());

export const ShowViewCommand = command("show-view")
	.public()
	.input(z.object({ view: StudioViewSchema }))
	.idempotencyKey(Repeatable)
	.handle(({ view }, { shownView }) => {
		const was = shownView.shownView();

		if (was === view) {
			return;
		}

		const reason = `view ${was} → ${view} (asked)`;
		shownView.saveShownView(view, reason);
		console.info(`[widgetarium] shown ${reason}`);
	});

export const RereadShownViewSubscriber = subscriber(ShownViewChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ShownViewQuery);
});
