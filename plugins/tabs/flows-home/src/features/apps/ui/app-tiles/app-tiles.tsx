import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useIsHomeEditing } from "../../../../shared/lib/home-editing-context.js";
import { orderedBy } from "../../../../shared/lib/tile-order.js";
import { useSortable } from "../../../../shared/lib/use-sortable.js";
import { AppIcon } from "../../../../shared/ui/app-icon/app-icon.js";
import { HomeSection } from "../../../../shared/ui/home-section/home-section.js";
import { TileChrome } from "../../../../shared/ui/tile-chrome/tile-chrome.js";
import { useAppTiles } from "../../lib/use-app-tiles.js";
import type { AppTilesPane } from "../../lib/use-app-tiles.js";
import { useSpanResize } from "../../lib/use-span-resize.js";

const TITLE = "Apps";
const EDIT_HINT = "Drag to move, pull a corner to resize";

export function AppTiles(pane: AppTilesPane): ReactElement | null {
	const area = useRef<HTMLDivElement | null>(null);
	const isEditing = useIsHomeEditing();
	const apps = useAppTiles(pane);
	const sortable = useSortable(
		apps.tiles.map(({ id }) => id),
		area,
		apps.sort,
	);
	const resize = useSpanResize(area, apps.resize);

	if (apps.tiles.length === 0) {
		return null;
	}

	return (
		<HomeSection title={TITLE} {...(isEditing ? { hint: EDIT_HINT } : {})}>
			<div ref={area} className="sumi-home-apps">
				{orderedBy(apps.tiles, ({ id }) => id, sortable.order).map((tile) => (
					<TileChrome
						key={tile.id}
						id={tile.id}
						label={tile.title}
						span={resize.spanOf(tile.id, tile.span)}
						isLifted={sortable.liftedId === tile.id}
						onGrip={(event) => sortable.begin(tile.id, event)}
						onRemove={() => apps.remove(tile.id)}
						onResize={(event) => resize.begin(tile.id, tile.span, event)}
					>
						<button type="button" className="sumi-home-app" disabled={isEditing} onClick={() => apps.open(tile.id)}>
							<AppIcon art={tile.art} title={tile.title} />
							<span className="sumi-home-app-name">{tile.title}</span>
						</button>
					</TileChrome>
				))}
			</div>
		</HomeSection>
	);
}
