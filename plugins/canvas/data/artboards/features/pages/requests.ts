import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { withAddedPage, withRenamedPage, withShownPage, withoutPage } from "../../shared/lib/canvas-edits.js";
import {
	CreatedPageSchema,
	NewPageAskSchema,
	PageAskSchema,
	RenamePageAskSchema,
} from "../../shared/schema/asks.schema.js";

export const createPage = command()
	.public()
	.input(NewPageAskSchema)
	.output(CreatedPageSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, name }, { canvases }) => {
		const added = withAddedPage(canvases.canvas(canvasId), name);
		canvases.saveCanvas(canvasId, added.canvas, added.reason);
		console.info(`[artboards] ${canvasId}: ${added.reason}`);
		return { page: added.id };
	});

export const renamePage = command()
	.public()
	.input(RenamePageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, page, name }, { canvases }) => {
		const renamed = withRenamedPage(canvases.canvas(canvasId), page, name);

		if (typeof renamed === "string") {
			return refuse(renamed);
		}

		canvases.saveCanvas(canvasId, renamed.canvas, renamed.reason);
		console.info(`[artboards] ${canvasId}: ${renamed.reason}`);
	});

export const removePage = command()
	.public()
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, page }, { canvases }) => {
		const removed = withoutPage(canvases.canvas(canvasId), page);

		if (typeof removed === "string") {
			return refuse(removed);
		}

		canvases.saveCanvas(canvasId, removed.canvas, removed.reason);
		console.info(`[artboards] ${canvasId}: ${removed.reason}`);
	});

export const showPage = command()
	.public()
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, page }, { canvases }) => {
		const shown = withShownPage(canvases.canvas(canvasId), page);

		if (typeof shown === "string") {
			return refuse(shown);
		}

		canvases.saveCanvas(canvasId, shown.canvas, shown.reason);
		console.info(`[artboards] ${canvasId}: ${shown.reason}`);
	});
