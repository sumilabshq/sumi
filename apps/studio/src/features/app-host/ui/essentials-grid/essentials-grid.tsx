import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TokenStyle } from "@widgetarium/kit";
import { columnsOf } from "../../lib/tab-drag/sidebar-layout.js";
import type { EssentialTile as EssentialTileState } from "@widgetarium/app-host";
import { EssentialTile } from "./essential-tile.js";

const ESSENTIALS = "Essentials";
const GRID =
	"cv:grid cv:flex-none cv:grid-cols-[repeat(var(--tabs-columns),minmax(0,1fr))] cv:gap-1.5 cv:pb-1 cv:empty:pb-0";

export function EssentialsGrid({ tiles }: { readonly tiles: readonly EssentialTileState[] }): ReactElement {
	const columns: TokenStyle = { "--tabs-columns": String(columnsOf(tiles.length)) };
	return (
		<div className={GRID} style={columns} aria-label={ESSENTIALS} data-tabs-essentials="">
			{tiles.map((tile) => (
				<EssentialTile key={tile.id} tile={tile} />
			))}
		</div>
	);
}
