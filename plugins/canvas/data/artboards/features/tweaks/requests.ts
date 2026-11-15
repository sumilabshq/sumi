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
	.handle(({ tabId, page }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		return [...tweaksOnPage(canvas, page ?? canvas.shownPage)];
	});

export const getBoardTweaks = query()
	.public()
	.input(TweaksAskSchema)
	.output(BoardTweaksSchema.array())
	.handle(({ tabId, page }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		return boardTweaksOnPage(canvas, page ?? canvas.shownPage);
	});

export const writeTweaks = command()
	.public()
	.input(WriteTweaksAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, page, board, tweaks }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		const scope = scopeOf(canvas, { page, board });

		if (typeof scope === "string") {
			return refuse(scope);
		}

		const written = withWrittenTweaks(canvas, scope, tweaks);

		if (typeof written === "string") {
			return refuse(written);
		}

		canvases.saveCanvas(tabId, written.canvas, written.reason);
		console.info(`[artboards] ${tabId}: ${written.reason}`);
	});

export const setTweakValue = command()
	.public()
	.input(SetTweakValueAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, value, ...target }, { canvases }) => {
		const set = withTweakValue(canvases.canvas(tabId), target, value);

		if (typeof set === "string") {
			return refuse(set);
		}

		canvases.saveCanvas(tabId, set.canvas, set.reason);
		console.info(`[artboards] ${tabId}: ${set.reason}`);
	});

export const resetTweaks = command()
	.public()
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, page }, { canvases }) => {
		const reset = withResetTweaks(canvases.canvas(tabId), page);
		canvases.saveCanvas(tabId, reset.canvas, reset.reason);
		console.info(`[artboards] ${tabId}: ${reset.reason}`);
	});

export const rereadTweaks = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getTweaks);
	invalidate(getBoardTweaks);
});
