import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SwitchAction, useFileTab } from "@sumi/files-plugin";
import { hasSecretsAt } from "../../lib/shown-code.js";

export interface ValuesActionProps {
	readonly tabId: string;
}

export function ValuesAction({ tabId }: ValuesActionProps): ReactElement | null {
	const { path } = useFileTab(tabId);

	if (path === null || !hasSecretsAt(path)) {
		return null;
	}

	return (
		<SwitchAction
			name="values"
			whenOff={{
				label: "Show hidden values",
				icon: "eye",
			}}
			whenOn={{
				label: "Hide values",
				icon: "eye-off",
			}}
		/>
	);
}
