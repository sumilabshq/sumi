import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { momentChanged } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { CameraAnswerSchema, CameraKeptSchema } from "../../shared/schema/camera.schema.js";
import { CanvasOpenedSchema, CanvasOpeningSchema, ModeAnswerSchema } from "../../shared/schema/canvas-view.schema.js";
import { OPENING_FIELDS, isTouching, momentWriteOf, openingOf } from "../../shared/lib/view/canvas-moment.js";
import { canvasOpenStepOf } from "./lib/canvas-opening.js";

export const open = command()
	.public()
	.input(CanvasOpenedSchema)
	.idempotencyKey(Repeatable)
	.handle((opened, { canvasMoment }) => {
		const step = canvasOpenStepOf(canvasMoment.moment(), opened);

		if (step.kind === "skip") {
			console.info(`[widgetarium] ${step.said}`);
			return;
		}

		canvasMoment.saveMoment(step.write);

		if (step.write.said !== null) {
			console.info(`[widgetarium] ${step.write.said}`);
		}
	});

export const opening = query()
	.public()
	.output(CanvasOpeningSchema)
	.settlesNow()
	.handle((_input, { canvasMoment }) => openingOf(canvasMoment.moment()));

export const camera = query()
	.public()
	.output(CameraAnswerSchema)
	.settlesNow()
	.handle((_input, { canvasMoment }) => ({ camera: canvasMoment.moment().camera }));

export const keepCamera = command()
	.public()
	.input(CameraKeptSchema)
	.idempotencyKey(Repeatable)
	.handle(({ camera }, { canvasMoment }) => {
		const write = momentWriteOf(canvasMoment.moment(), { camera }, "camera moved");

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const mode = query()
	.public()
	.output(ModeAnswerSchema)
	.settlesNow()
	.handle((_input, { canvasMoment }) => ({ mode: canvasMoment.moment().mode }));

export const setMode = command()
	.public()
	.input(ModeAnswerSchema)
	.idempotencyKey(Repeatable)
	.handle(({ mode }, { canvasMoment }) => {
		const write = momentWriteOf(canvasMoment.moment(), { mode }, `${mode} mode`);

		if (write === null) {
			console.info(`[widgetarium] canvas mode skipped: already ${mode}`);
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const reread = subscriber(momentChanged).handle(({ fields }, { invalidate }) => {
	if (fields.includes("camera")) {
		invalidate(camera);
	}

	if (fields.includes("mode")) {
		invalidate(mode);
	}

	if (isTouching(fields, OPENING_FIELDS)) {
		invalidate(opening);
	}
});
