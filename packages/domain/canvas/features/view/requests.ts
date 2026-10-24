import { Repeatable, command, query, subscriber } from "@widgetarium/core/requests";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { CanvasMomentGateway } from "../../gateways/canvas-moment/canvas-moment.gateway.js";
import { CameraAnswerSchema, CameraKeptSchema } from "../../shared/schema/camera.schema.js";
import { CanvasOpenedSchema, CanvasOpeningSchema, ModeAnswerSchema } from "../../shared/schema/canvas-view.schema.js";
import {
	OPENING_FIELDS,
	isTouching,
	momentOpened,
	momentWriteOf,
	openingOf,
} from "../../shared/lib/view/canvas-moment.js";

export const OpenCanvasCommand = command("open-canvas")
	.input(CanvasOpenedSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
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
	.output(CanvasOpeningSchema)
	.settlesNow()
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle((_input, { canvasMoment }) => openingOf(canvasMoment.moment()));

export const CameraQuery = query("camera")
	.output(CameraAnswerSchema)
	.settlesNow()
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle((_input, { canvasMoment }) => ({ camera: canvasMoment.moment().camera }));

export const KeepCameraCommand = command("keep-camera")
	.input(CameraKeptSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ camera }, { canvasMoment }) => {
		const write = momentWriteOf(canvasMoment.moment(), { camera }, "camera moved");

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const ModeQuery = query("mode")
	.output(ModeAnswerSchema)
	.settlesNow()
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle((_input, { canvasMoment }) => ({ mode: canvasMoment.moment().mode }));

export const SetModeCommand = command("set-mode")
	.input(ModeAnswerSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
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
