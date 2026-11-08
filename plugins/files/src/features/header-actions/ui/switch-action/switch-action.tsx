import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FlipFileSwitchCommand } from "@sumi/file-page";
import type { FileSwitch } from "@sumi/file-page";
import { ToggleAction } from "@sumi/sumi-host-plugin";
import type { ToggleFace } from "@sumi/sumi-host-plugin";
import { useCommand } from "@widgetarium/data-framework";
import { useFileSwitches } from "../../lib/use-file-switches.js";

export interface SwitchActionProps {
	readonly name: FileSwitch;
	readonly whenOff: ToggleFace;
	readonly whenOn: ToggleFace;
}

export function SwitchAction({ name, whenOff, whenOn }: SwitchActionProps): ReactElement {
	const flip = useCommand(FlipFileSwitchCommand);
	return (
		<ToggleAction
			isOn={useFileSwitches().isOn(name)}
			whenOn={whenOn}
			whenOff={whenOff}
			onToggle={() => void flip.run({ name })}
		/>
	);
}
