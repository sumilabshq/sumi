import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SwitchAction } from "@sumi/files-plugin";

export function SizeAction(): ReactElement {
	return (
		<SwitchAction
			name="size"
			whenOff={{
				label: "Show at 100%",
				icon: "maximize-2",
			}}
			whenOn={{
				label: "Fit to the page",
				icon: "minimize-2",
			}}
		/>
	);
}
