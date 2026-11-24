import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface EditToggleProps {
	readonly isEditing: boolean;
	readonly onToggle: () => void;
}

const EDIT_LABEL = "Edit Home";
const DONE_LABEL = "Done";
const EDIT_ICON_PX = 14;

export function EditToggle({ isEditing, onToggle }: EditToggleProps): ReactElement {
	return (
		<button type="button" className="sumi-home-edit" data-editing={isEditing ? "" : undefined} aria-label={isEditing ? DONE_LABEL : EDIT_LABEL} onClick={onToggle}>
			{isEditing ? DONE_LABEL : <Icon name="pencil-line" size={EDIT_ICON_PX} />}
		</button>
	);
}
