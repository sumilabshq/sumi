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
	.handle(({ tabId, name }, { canvases }) => {
		const added = withAddedPage(canvases.canvas(tabId), name);
		canvases.saveCanvas(tabId, added.canvas, added.reason);
		console.info(`[artboards] ${tabId}: ${added.reason}`);
		return { page: added.id };
	});

export const renamePage = command()
	.public()
	.input(RenamePageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, page, name }, { canvases }) => {
		const renamed = withRenamedPage(canvases.canvas(tabId), page, name);

		if (typeof renamed === "string") {
			return refuse(renamed);
		}

		canvases.saveCanvas(tabId, renamed.canvas, renamed.reason);
		console.info(`[artboards] ${tabId}: ${renamed.reason}`);
	});

export const removePage = command()
	.public()
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, page }, { canvases }) => {
		const removed = withoutPage(canvases.canvas(tabId), page);

		if (typeof removed === "string") {
			return refuse(removed);
		}

		canvases.saveCanvas(tabId, removed.canvas, removed.reason);
		console.info(`[artboards] ${tabId}: ${removed.reason}`);
	});

export const showPage = command()
	.public()
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, page }, { canvases }) => {
		const shown = withShownPage(canvases.canvas(tabId), page);

		if (typeof shown === "string") {
			return refuse(shown);
		}

		canvases.saveCanvas(tabId, shown.canvas, shown.reason);
		console.info(`[artboards] ${tabId}: ${shown.reason}`);
	});
