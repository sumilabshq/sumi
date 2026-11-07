import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FlipFileSwitchCommand } from "@sumi/file-page";
import type { FileSwitch } from "@sumi/file-page";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useCommand } from "@widgetarium/data-framework";
import { useFileSwitches } from "../../lib/use-file-switches.js";

export interface SwitchFace {
	readonly label: string;
	readonly icon: string;
}

export interface SwitchActionProps {
	readonly name: FileSwitch;
	readonly whenOff: SwitchFace;
	readonly whenOn: SwitchFace;
}

export function SwitchAction({ name, whenOff, whenOn }: SwitchActionProps): ReactElement {
	const { Action } = useTabHeader();
	const flip = useCommand(FlipFileSwitchCommand);
	const face = useFileSwitches().isOn(name) ? whenOn : whenOff;
	return <Action label={face.label} icon={face.icon} onPress={() => void flip.run({ name })} />;
}
