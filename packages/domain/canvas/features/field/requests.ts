import { Repeatable, command, query, subscriber } from "@widgetarium/data-framework";
import { AgentJobsGateway } from "../../gateways/agent-jobs/agent-jobs.gateway.js";
import { JobsChangedEvent } from "../../gateways/agent-jobs/agent-jobs.events.js";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { CanvasMomentGateway } from "../../gateways/canvas-moment/canvas-moment.gateway.js";
import { DesignChangedEvent } from "../../gateways/design-folder/design-folder.events.js";
import { DesignFolderGateway } from "../../gateways/design-folder/design-folder.gateway.js";
import { WidgetDrawingGateway } from "../../gateways/widget-drawing/widget-drawing.gateway.js";
import type { CanvasField } from "../../shared/schema/canvas-moment.schema.js";
import { DrawingSchema } from "../../shared/schema/drawing.schema.js";
import { FieldRegionsSchema } from "../../shared/schema/regions.schema.js";
import { FieldStateSchema, SpotFoundSchema, SpotPickSchema } from "../../shared/schema/selection.schema.js";
import { pickedChange } from "../../shared/lib/layers/picked-change.js";
import { pickedMarkOf } from "../../shared/lib/layers/picked-mark.js";
import { pictureWidgetsShownOf } from "../../shared/lib/layers/shown-screen.js";
import { PAGE_FIELDS, pagesNowOf } from "../../shared/lib/pages/pages-now.js";
import { isTouching, momentWriteOf } from "../../shared/lib/view/canvas-moment.js";
import { regionsOf } from "./lib/regions-of.js";

const FIELD_STATE_FIELDS: readonly CanvasField[] = [...PAGE_FIELDS, "mode", "selection", "focusedWidget"];

export const DrawingQuery = query("drawing")
	.output(DrawingSchema)
	.settlesNow()
	.inject({ widgetDrawing: WidgetDrawingGateway })
	.handle((_input, { widgetDrawing }) => widgetDrawing.drawing());

export const FieldRegionsQuery = query("field-regions")
	.output(FieldRegionsSchema)
	.inject({
		canvasMoment: CanvasMomentGateway,
		designFolder: DesignFolderGateway,
		agentJobs: AgentJobsGateway,
		widgetDrawing: WidgetDrawingGateway,
	})
	.handle(async (_input, { canvasMoment, designFolder, agentJobs, widgetDrawing }) => {
		const moment = canvasMoment.moment();
		const now = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		return { regions: regionsOf(now, widgetDrawing.drawing()) };
	});

export const FieldStateQuery = query("field-state")
	.output(FieldStateSchema)
	.inject({
		canvasMoment: CanvasMomentGateway,
		designFolder: DesignFolderGateway,
		agentJobs: AgentJobsGateway,
	})
	.handle(async (_input, { canvasMoment, designFolder, agentJobs }) => {
		const moment = canvasMoment.moment();
		const now = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		const { mode, selection, focusedWidget } = moment;
		return {
			page: now.pages.shown,
			isPointer: mode === "pointer",
			flyTo: focusedWidget,
			pickedMark: pickedMarkOf({ selection }, pictureWidgetsShownOf(now)),
			pickedSpot: selection?.spot ?? null,
			unresolved:
				selection && selection.spot === null
					? {
							widget: selection.widget,
							mark: selection.mark,
						}
					: null,
		};
	});

export const PickSpotCommand = command("pick-spot")
	.input(SpotPickSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ selection }, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const { change, reason } = pickedChange(moment, selection);
		const write = momentWriteOf(moment, change, reason);

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const ResolveSpotCommand = command("resolve-spot")
	.input(SpotFoundSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ spot }, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const { selection } = moment;

		if (selection?.mark !== spot.mark) {
			console.info(`[widgetarium] canvas unchanged (the spot of ${spot.mark}: the pick moved on)`);
			return;
		}

		const resolved = {
			...selection,
			spot,
		};
		const write = momentWriteOf(moment, { selection: resolved }, `found ${spot.mark} on the canvas`);

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const RereadFieldSubscriber = subscriber(CanvasMomentChangedEvent).handle(({ fields }, { invalidate }) => {
	if (isTouching(fields, PAGE_FIELDS)) {
		invalidate(FieldRegionsQuery);
	}

	if (isTouching(fields, FIELD_STATE_FIELDS)) {
		invalidate(FieldStateQuery);
	}
});

export const RereadFieldForDesignSubscriber = subscriber(DesignChangedEvent).handle((_input, { invalidate }) => {
	invalidate(FieldRegionsQuery);
	invalidate(FieldStateQuery);
});

export const RereadFieldForJobsSubscriber = subscriber(JobsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(FieldRegionsQuery);
	invalidate(FieldStateQuery);
});
