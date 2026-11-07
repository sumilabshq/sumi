import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { HeaderActionProps } from "@sumi/sumi-host-plugin";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";

const DONE_LOOK = {
	color: "var(--sumi-hue-green)",
};

export function PageHeaderAction({
	label,
	icon,
	isDone = false,
	isOff = false,
	isBusy = false,
	onPress,
}: HeaderActionProps): ReactElement {
	return (
		<HeaderButton
			label={label}
			icon={icon}
			isOff={isOff}
			aria-busy={isBusy || undefined}
			style={isDone ? DONE_LOOK : undefined}
			onClick={() => !isOff && onPress()}
		/>
	);
}
