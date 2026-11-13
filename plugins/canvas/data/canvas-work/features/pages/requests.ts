import { Repeatable } from "@widgetarium/data-framework";
import { artboards } from "@sumi/artboards/contract";
import { command } from "#module";
import {
	CreatedPageSchema,
	NewPageAskSchema,
	PageAskSchema,
	RenamePageAskSchema,
} from "../../shared/schema/canvas-work.schema.js";

export const createPage = command()
	.public()
	.metadata({
		description:
			"Add a page to a canvas and show it. A page groups artboards of one subject (Website, Mobile, Explorations); a new canvas starts with one, Untitled page. Name it for what it will hold.",
	})
	.input(NewPageAskSchema)
	.output(CreatedPageSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.pages.createPage, ask));

export const renamePage = command()
	.public()
	.metadata({ description: "Rename a page of a canvas." })
	.input(RenamePageAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.pages.renamePage, ask));

export const removePage = command()
	.public()
	.metadata({
		description:
			"Remove a page and every artboard on it. Refused for a canvas's only page. Ask the person before removing work they made.",
	})
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.pages.removePage, ask));

export const showPage = command()
	.public()
	.metadata({
		description: "Show a page of a canvas to the person, so they see what you are drawing there.",
	})
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.pages.showPage, ask));
