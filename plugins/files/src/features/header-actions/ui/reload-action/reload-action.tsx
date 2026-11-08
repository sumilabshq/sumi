import { createElement as h } from "react";
import type { ReactElement } from "react";
import { filePage } from "@sumi/file-page/contract";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useCommand } from "@widgetarium/data-framework";
import { useFlashesDone } from "../../lib/use-flashes-done.js";

export function ReloadAction(): ReactElement {
	const { Action } = useTabHeader();
	const reload = useCommand(filePage.switches.reload);
	const flash = useFlashesDone();
	return (
		<Action
			label="Reload"
			icon={flash.isDone ? "check" : "rotate-cw"}
			isDone={flash.isDone}
			onPress={() => flash.run(() => reload.run())}
		/>
	);
}
