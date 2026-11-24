import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { FlowIcon } from "@widgetarium/navigation/contract";
import { FLOW_ICON_CHOICES, iconChoiceOf } from "../../../../shared/lib/flow-icons.js";

const CHOICE_PX = 14;
const REMOVE_ICON = "Remove icon";

export interface IconPickerProps {
	readonly icon: FlowIcon | null;
	readonly onPick: (icon: FlowIcon | null) => void;
}

export function IconPicker({ icon, onPick }: IconPickerProps): ReactElement {
	const pickedName = icon?.kind === "icon" ? icon.name : null;
	return (
		<div className="sumi-flows-picker" onMouseDown={(event) => event.preventDefault()}>
			<div className="sumi-flows-picker-grid">
				{FLOW_ICON_CHOICES.map((name) => (
					<button
						key={name}
						type="button"
						className="sumi-flows-picker-choice"
						aria-label={name}
						aria-pressed={name === pickedName}
						onClick={() => onPick(iconChoiceOf(name))}
					>
						<Icon name={name} size={CHOICE_PX} />
					</button>
				))}
			</div>
			<button type="button" className="sumi-flows-picker-remove" disabled={icon === null} onClick={() => onPick(null)}>
				{REMOVE_ICON}
			</button>
		</div>
	);
}
