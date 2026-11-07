import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SwitchAction } from "@sumi/files-plugin";

export function WrapAction(): ReactElement {
	return (
		<SwitchAction
			name="wrap"
			whenOff={{
				label: "Wrap lines",
				icon: "move-horizontal",
			}}
			whenOn={{
				label: "Stop wrapping lines",
				icon: "text-wrap",
			}}
		/>
	);
}
