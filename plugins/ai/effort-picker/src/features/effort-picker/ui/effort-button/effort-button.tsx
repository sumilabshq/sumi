import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ComposerOptionSelect } from "@sumi/chat-plugin";
import type { ComposerOptionProps } from "@sumi/chat-plugin";

export function EffortButton(props: ComposerOptionProps): ReactElement {
	return (
		<ComposerOptionSelect {...props} optionKey="effort" align="end" className="sumi-effort-trigger" form="round" />
	);
}
