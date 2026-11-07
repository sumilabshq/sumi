import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SwitchAction } from "../switch-action/switch-action.js";

export function SourceAction(): ReactElement {
	return (
		<SwitchAction
			name="source"
			whenOff={{
				label: "Show source",
				icon: "code",
			}}
			whenOn={{
				label: "Show page",
				icon: "file-text",
			}}
		/>
	);
}
