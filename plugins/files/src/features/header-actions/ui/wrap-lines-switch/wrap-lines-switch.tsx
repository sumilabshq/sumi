import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FlipFileSwitchCommand } from "@sumi/file-page";
import { WrapLinesAction } from "@sumi/sumi-host-plugin";
import { useCommand } from "@widgetarium/data-framework";
import { useFileSwitches } from "../../lib/use-file-switches.js";

const WRAP_SWITCH = "wrap";

export function WrapLinesSwitch(): ReactElement {
	const flip = useCommand(FlipFileSwitchCommand);
	return (
		<WrapLinesAction
			isWrapped={useFileSwitches().isOn(WRAP_SWITCH)}
			onToggle={() => void flip.run({ name: WRAP_SWITCH })}
		/>
	);
}
