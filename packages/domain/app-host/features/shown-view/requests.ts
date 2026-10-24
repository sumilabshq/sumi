import { z } from "zod";
import { Repeatable, command, query, subscriber } from "@widgetarium/core/requests";
import { ShownViewChangedEvent } from "../../gateways/shown-view/shown-view.events.js";
import { ShownViewGateway } from "../../gateways/shown-view/shown-view.gateway.js";
import { StudioViewSchema } from "../../shared/schema/studio-view.schema.js";

export const ShownViewQuery = query("shown-view")
	.output(StudioViewSchema)
	.settlesNow()
	.inject({ shownView: ShownViewGateway })
	.handle((_input, { shownView }) => shownView.shownView());

export const ShowViewCommand = command("show-view")
	.input(z.object({ view: StudioViewSchema }))
	.idempotencyKey(Repeatable)
	.inject({ shownView: ShownViewGateway })
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
