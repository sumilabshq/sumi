import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { EssentialTile as EssentialTileState } from "@widgetarium/app-host/contract";
import { EssentialTile } from "./essential-tile.js";

const ESSENTIALS = "Essentials";
const GRID =
	"cv:mx-(--sumi-side-pad) cv:mt-1 cv:mb-2 cv:grid cv:flex-none cv:grid-cols-[repeat(auto-fit,minmax(calc((100%_-_18px)/4),1fr))] cv:gap-1.5 cv:empty:m-0";

export function EssentialsGrid({ tiles }: { readonly tiles: readonly EssentialTileState[] }): ReactElement {
	return (
		<div className={GRID} aria-label={ESSENTIALS} data-tabs-essentials="">
			{tiles.map((tile) => (
				<EssentialTile key={tile.id} tile={tile} />
			))}
		</div>
	);
}
