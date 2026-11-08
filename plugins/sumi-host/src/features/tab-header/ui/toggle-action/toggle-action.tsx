import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useTabHeader } from "../../lib/tab-header-context.js";

export interface ToggleFace {
	readonly label: string;
	readonly icon: string;
}

export interface ToggleActionProps {
	readonly isOn: boolean;
	readonly whenOn: ToggleFace;
	readonly whenOff: ToggleFace;
	onToggle(): void;
}

export function ToggleAction({ isOn, whenOn, whenOff, onToggle }: ToggleActionProps): ReactElement {
	const { Action } = useTabHeader();
	const face = isOn ? whenOn : whenOff;
	return (
		<Action
			label={face.label}
			icon={face.icon}
			onPress={onToggle}
		/>
	);
}
