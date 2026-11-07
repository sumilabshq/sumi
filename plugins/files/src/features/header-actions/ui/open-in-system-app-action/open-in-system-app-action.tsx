import { createElement as h } from "react";
import type { ReactElement } from "react";
import { OpenInSystemAppCommand } from "@sumi/contract";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useRuntime } from "@widgetarium/data-framework";
import { useFileTab } from "../../../../shared/lib/use-file-tab.js";
import { useFlashesDone } from "../../lib/use-flashes-done.js";

export interface OpenInSystemAppActionProps {
	readonly tabId: string;
}

export function OpenInSystemAppAction({ tabId }: OpenInSystemAppActionProps): ReactElement {
	const { Action } = useTabHeader();
	const { path } = useFileTab(tabId);
	const shell = useRuntime("OpenInSystemAppAction");
	const flash = useFlashesDone();
	return (
		<Action
			label="Open in system app"
			icon={flash.isDone ? "check" : "external-link"}
			isDone={flash.isDone}
			isOff={path === null}
			onPress={() =>
				path !== null &&
				flash.run(async () => {
					const opened = await shell.send(OpenInSystemAppCommand, { path });

					if (!opened.ok) {
						throw new Error(opened.reason);
					}
				})
			}
		/>
	);
}
