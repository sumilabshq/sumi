import { Repeatable } from "@widgetarium/data-framework";
import { artboards } from "@sumi/artboards/contract";
import { command, query } from "#module";
import { TweakReadSchema, TweaksAskSchema, WriteTweaksAskSchema } from "../../shared/schema/tweak-work.schema.js";

export const writeTweaks = command()
	.public()
	.metadata({
		description:
			'Give the person live controls for a page or one artboard, drawn by Sumi in the canvas side panel: a slider (number), a switch (toggle) or a few options (choice). Use them instead of drawing controls inside an artboard, which takes no clicks. board null writes the page\'s tweaks, which reach every artboard on it; a board id writes that artboard\'s own, and an own tweak wins over a page tweak with the same id. The list replaces what that page or artboard had; an empty list removes them. Each value reaches the artboard at once, without a reload: as the CSS variable --id on the html element (a number with its unit, a toggle as 1 or 0), as the attribute data-id on it, and in window.tweaks[id] with a "tweaks" event on window. Most tweaks need only CSS: border-radius: var(--radius), :root[data-theme="dark"] { }. For the rest write plain JavaScript in the artboard: function paint() { } paint(); addEventListener("tweaks", paint).',
	})
	.input(WriteTweaksAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.tweaks.writeTweaks, ask));

export const getTweaks = query()
	.public()
	.metadata({
		description:
			"Read a page's tweaks with the values the person left them at: the page's own (board null) and each artboard's.",
	})
	.input(TweaksAskSchema)
	.output(TweakReadSchema.array())
	.handle((ask, { send }) => send(artboards.tweaks.getTweaks, ask));
