import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { BACKGROUND_CHOICES, CUSTOM_BACKGROUND, pickColor } from "../../lib/background-choices.js";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { BackgroundSwatch } from "../background-swatch/background-swatch.js";

const MENU_LABEL = "Canvas background";

export function BackgroundItems({ onChosen }: { readonly onChosen: () => void }): ReactElement {
	const { canvasId } = useCanvasView();
	const current = useQuery(artboards.canvases.getCanvas, { canvasId }).data.background;
	const choose = useCommand(artboards.view.setBackground);
	const isPreset = BACKGROUND_CHOICES.some(({ value }) => value === current);
	return (
		<div role="menu" aria-label={MENU_LABEL}>
			{BACKGROUND_CHOICES.map((choice) => (
				<PopoverItem
					key={choice.label}
					role="menuitemradio"
					checked={choice.value === current}
					onClick={() => {
						onChosen();
						void choose.run({ canvasId, background: choice.value });
					}}
				>
					<BackgroundSwatch value={choice.value} />
					{choice.label}
				</PopoverItem>
			))}
			<PopoverSeparator />
			<PopoverItem
				role="menuitemradio"
				checked={!isPreset}
				onClick={() => {
					onChosen();
					void pickColor(current).then((picked) => {
						if (picked !== null) {
							void choose.run({ canvasId, background: picked });
						}
					});
				}}
			>
				<BackgroundSwatch value={isPreset ? null : current} isCustom />
				{CUSTOM_BACKGROUND}
			</PopoverItem>
		</div>
	);
}
