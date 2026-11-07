import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { CameraAnswerSchema, CameraKeptSchema } from "../../shared/schema/camera.schema.js";
import { CanvasOpenedSchema, CanvasOpeningSchema, ModeAnswerSchema } from "../../shared/schema/canvas-view.schema.js";
import { OPENING_FIELDS, isTouching, momentOpened, momentWriteOf, openingOf } from "../../shared/lib/view/canvas-moment.js";

export const OpenCanvasCommand = command("open-canvas")
	.public()
	.input(CanvasOpenedSchema)
	.idempotencyKey(Repeatable)
	.handle((opened, { canvasMoment }) => {
		const write = momentWriteOf(canvasMoment.moment(), momentOpened(opened), `open ${opened.app}`);

		if (write === null) {
			console.info(`[widgetarium] canvas open skipped: ${opened.app} is open as asked`);
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const CanvasOpeningQuery = query("canvas-opening")
	.public()
	.output(CanvasOpeningSchema)
	.settlesNow()
	.handle((_input, { canvasMoment }) => openingOf(canvasMoment.moment()));

export const CameraQuery = query("camera")
	.public()
	.output(CameraAnswerSchema)
	.settlesNow()
	.handle((_input, { canvasMoment }) => ({ camera: canvasMoment.moment().camera }));

export const KeepCameraCommand = command("keep-camera")
	.public()
	.input(CameraKeptSchema)
	.idempotencyKey(Repeatable)
	.handle(({ camera }, { canvasMoment }) => {
		const write = momentWriteOf(canvasMoment.moment(), { camera }, "camera moved");

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const ModeQuery = query("mode")
	.public()
	.output(ModeAnswerSchema)
	.settlesNow()
	.handle((_input, { canvasMoment }) => ({ mode: canvasMoment.moment().mode }));

export const SetModeCommand = command("set-mode")
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

export const RereadViewSubscriber = subscriber(CanvasMomentChangedEvent).handle(({ fields }, { invalidate }) => {
	if (fields.includes("camera")) {
		invalidate(CameraQuery);
	}

	if (fields.includes("mode")) {
		invalidate(ModeQuery);
	}

	if (isTouching(fields, OPENING_FIELDS)) {
		invalidate(CanvasOpeningQuery);
	}
});
