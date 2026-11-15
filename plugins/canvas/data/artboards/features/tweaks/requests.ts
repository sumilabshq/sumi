import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { canvasesChanged } from "../../gateways/canvases/canvases.events.js";
import {
	boardTweaksOnPage,
	scopeOf,
	tweaksOnPage,
	withResetTweaks,
	withTweakValue,
	withWrittenTweaks,
} from "../../shared/lib/tweak-edits.js";
import {
	PageAskSchema,
	SetTweakValueAskSchema,
	TweaksAskSchema,
	WriteTweaksAskSchema,
} from "../../shared/schema/asks.schema.js";
import { BoardTweaksSchema, TweakSchema } from "../../shared/schema/canvas.schema.js";

export const getTweaks = query()
	.public()
	.input(TweaksAskSchema)
	.output(TweakSchema.array())
	.handle(({ canvasId, page }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		return [...tweaksOnPage(canvas, page ?? canvas.shownPage)];
	});

export const getBoardTweaks = query()
	.public()
	.input(TweaksAskSchema)
	.output(BoardTweaksSchema.array())
	.handle(({ canvasId, page }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		return boardTweaksOnPage(canvas, page ?? canvas.shownPage);
	});

export const writeTweaks = command()
	.public()
	.input(WriteTweaksAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, page, board, tweaks }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		const scope = scopeOf(canvas, { page, board });

		if (typeof scope === "string") {
			return refuse(scope);
		}

		const written = withWrittenTweaks(canvas, scope, tweaks);

		if (typeof written === "string") {
			return refuse(written);
		}

		canvases.saveCanvas(canvasId, written.canvas, written.reason);
		console.info(`[artboards] ${canvasId}: ${written.reason}`);
	});

export const setTweakValue = command()
	.public()
	.input(SetTweakValueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, value, ...target }, { canvases }) => {
		const set = withTweakValue(canvases.canvas(canvasId), target, value);

		if (typeof set === "string") {
			return refuse(set);
		}

		canvases.saveCanvas(canvasId, set.canvas, set.reason);
		console.info(`[artboards] ${canvasId}: ${set.reason}`);
	});

export const resetTweaks = command()
	.public()
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, page }, { canvases }) => {
		const reset = withResetTweaks(canvases.canvas(canvasId), page);
		canvases.saveCanvas(canvasId, reset.canvas, reset.reason);
		console.info(`[artboards] ${canvasId}: ${reset.reason}`);
	});

export const rereadTweaks = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getTweaks);
	invalidate(getBoardTweaks);
});
