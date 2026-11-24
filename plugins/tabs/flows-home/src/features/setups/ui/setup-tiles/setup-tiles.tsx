import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useIsHomeEditing } from "../../../../shared/lib/home-editing-context.js";
import { orderedBy } from "../../../../shared/lib/tile-order.js";
import { useListedApps } from "../../../../shared/lib/use-listed-apps.js";
import { useSortable } from "../../../../shared/lib/use-sortable.js";
import { HomeSection } from "../../../../shared/ui/home-section/home-section.js";
import { TileChrome } from "../../../../shared/ui/tile-chrome/tile-chrome.js";
import { useSetupTiles } from "../../lib/use-setup-tiles.js";
import { SetupThumb } from "../setup-thumb/setup-thumb.js";

const TITLE = "Setups";
const EDIT_HINT = "Save a new one from any flow's tab menu";

export function SetupTiles(): ReactElement | null {
	const area = useRef<HTMLDivElement | null>(null);
	const isEditing = useIsHomeEditing();
	const { artOf } = useListedApps();
	const tiles = useSetupTiles();
	const sortable = useSortable(
		tiles.setups.map(({ id }) => id),
		area,
		tiles.sort,
	);

	if (tiles.setups.length === 0 && !isEditing) {
		return null;
	}

	return (
		<HomeSection title={TITLE} {...(isEditing ? { hint: EDIT_HINT } : {})}>
			<div ref={area} className="sumi-home-setups">
				{orderedBy(tiles.setups, ({ id }) => id, sortable.order).map((setup) => (
					<TileChrome
						key={setup.id}
						id={setup.id}
						label={setup.name}
						isLifted={sortable.liftedId === setup.id}
						onGrip={(event) => sortable.begin(setup.id, event)}
						onRemove={() => tiles.remove(setup.id)}
					>
						<button type="button" className="sumi-home-setup" disabled={isEditing} onClick={() => tiles.start(setup.id)}>
							<SetupThumb root={setup.root} artOf={artOf} />
							<span className="sumi-home-setup-name">{setup.name}</span>
						</button>
					</TileChrome>
				))}
			</div>
		</HomeSection>
	);
}
