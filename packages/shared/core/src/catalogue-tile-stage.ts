import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { Preview } from "./catalogue-preview.js";
import type { PreviewTileProps } from "./catalogue-preview.js";

export type TileStageProps = PreviewTileProps;

type LatticeStyle = CSSProperties & {
	readonly "--widget-cell": string;
	readonly "--widget-gap": string;
	readonly "--cat-across": number;
};

export function TileStage({ definition, registry, host, tile, entry }: TileStageProps): ReactElement {
	const lattice: LatticeStyle = {
		"--widget-cell": `${tile.cell}px`,
		"--widget-gap": `${tile.gap}px`,
		"--cat-across": tile.w,
	};
	const frame = { width: `${Math.round(tile.frameWidth)}px`, height: `${Math.round(tile.frameHeight)}px` };
	return h(
		"div",
		{ className: "wg-cat-stage", style: lattice },
		h(
			"div",
			{ className: "wg-cat-frame", style: frame },
			h("div", { className: "wg-cat-pic", inert: true }, h(Preview, { definition, registry, host, tile, entry })),
		),
	);
}
