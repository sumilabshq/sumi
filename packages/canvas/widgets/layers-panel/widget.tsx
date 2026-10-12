import { createElement as h } from "react";
import { z } from "zod";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata } from "@widgetarium/core";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import { CanvasModeSchema } from "../../schemas/canvas-view.schema.js";
import { ReadDesignSchema } from "../../schemas/design.schema.js";
import { DrawingKitSchema } from "../../schemas/drawing.schema.js";
import { LayerDropSchema } from "../../schemas/layer-move.schema.js";
import { SelectAskSchema, SelectionSchema } from "../../schemas/selection.schema.js";
import { LayersPanel } from "./ui/layers-panel.js";

const LayersPanelWidget = createWidget({
	inject: {
		getDesign: IQuery.output(ReadDesignSchema.nullable().default(null)),
		getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
		getPages: IQuery.output(CanvasPagesSchema.nullable().default(null)),
		getIsLayersOpen: IQuery.output(z.boolean().default(false)),
		getMode: IQuery.output(CanvasModeSchema.default("hand")),
		getSelection: IQuery.output(SelectionSchema.nullable().default(null)),
		select: ICommand.input(SelectAskSchema),
		moveLayer: ICommand.input(LayerDropSchema),
	},
	draw: ({ getDesign, getDrawing, getPages, getIsLayersOpen, getMode, getSelection, select, moveLayer }) => {
		const screen = getDesign?.screens.find((one) => one.name === getPages?.shownScreen);
		if (!screen || !getDrawing) return null;
		return (
			<LayersPanel
				screen={screen}
				isOpen={getIsLayersOpen}
				keepsLiveCopy={getMode === "pointer"}
				registry={getDrawing.registry}
				picked={getSelection?.mark ?? null}
				onPick={(widget, mark) => reasonOf(select({ selection: mark ? { widget, mark, spot: null } : null }))}
				onDrop={(dropped) => reasonOf(moveLayer(dropped))}
			/>
		);
	},
});

async function reasonOf(
	answer: Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }>,
): Promise<string | null> {
	const heard = await answer;
	return heard.ok ? null : heard.reason;
}

export const metadata = defineMetadata(LayersPanelWidget, {
	title: "Layers panel",
	description: "The layers of the page shown on the canvas: pick a part, or drag it to another place in the page.",
	keywords: ["design", "canvas", "layers", "tree", "structure", "drag"],
	props: {
		getDesign: { label: "Design", hint: "The screens whose layers are listed." },
		getDrawing: { label: "Drawing", hint: "The widgets the page is drawn with, to read its layers." },
		getPages: { label: "Tabs", hint: "Which screen is shown." },
		getIsLayersOpen: { label: "Layers open", hint: "On, the panel stands beside the canvas." },
		getMode: { label: "Mode", hint: "While picking, the page's layers are kept read." },
		getSelection: { label: "Selection", hint: "The part picked, marked in the list." },
		select: { label: "Pick a part", hint: "Picks the part pressed in the list." },
		moveLayer: { label: "Move a layer", hint: "Moves a dragged part in the page's code." },
	},
});

export const layout = defineLayout({ role: "navigation", size: { preferredWidth: 260, preferredHeight: "auto" } });

export default LayersPanelWidget;
