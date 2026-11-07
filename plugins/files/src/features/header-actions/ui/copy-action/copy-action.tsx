import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useFlashesDone } from "../../lib/use-flashes-done.js";

export interface CopyActionProps {
	readonly copied: string | null;
}

const COPY = "Copy";
const COPIED = "Copied";

export function CopyAction({ copied }: CopyActionProps): ReactElement {
	const { Action } = useTabHeader();
	const flash = useFlashesDone();
	return (
		<Action
			label={flash.isDone ? COPIED : COPY}
			icon={flash.isDone ? "check" : "copy"}
			isDone={flash.isDone}
			isOff={copied === null}
			onPress={() => copied !== null && flash.run(() => navigator.clipboard.writeText(copied))}
		/>
	);
}
