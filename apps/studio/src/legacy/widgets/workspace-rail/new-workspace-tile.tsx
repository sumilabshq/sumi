import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Popover } from "@widgetarium/kit";
import { QuietLine } from "../quiet-line.js";
import { RailTile } from "./rail-tile.js";

export interface NewWorkspaceTileProps {
	readonly refusal: string | null;
	readonly onCreate: () => void;
	readonly onDismiss: () => void;
}

const NEW_WORKSPACE = "New workspace";

export function NewWorkspaceTile({ refusal, onCreate, onDismiss }: NewWorkspaceTileProps): ReactElement {
	const tile = (
		<RailTile label={NEW_WORKSPACE} onPress={onCreate}>
			<Icon name="plus" />
		</RailTile>
	);
	return (
		<Popover open={refusal !== null} onOpenChange={(open) => open || onDismiss()} placement="below" trigger={tile}>
			<QuietLine said={refusal} name="Refusal" />
		</Popover>
	);
}
