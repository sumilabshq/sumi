import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ToggleAction } from "../toggle-action/toggle-action.js";

export interface WrapLinesActionProps {
	readonly isWrapped: boolean;
	onToggle(): void;
}

const WRAPPED = {
	label: "Stop wrapping lines",
	icon: "text-wrap",
};
const UNWRAPPED = {
	label: "Wrap lines",
	icon: "move-horizontal",
};

export function WrapLinesAction({ isWrapped, onToggle }: WrapLinesActionProps): ReactElement {
	return (
		<ToggleAction
			isOn={isWrapped}
			whenOn={WRAPPED}
			whenOff={UNWRAPPED}
			onToggle={onToggle}
		/>
	);
}
