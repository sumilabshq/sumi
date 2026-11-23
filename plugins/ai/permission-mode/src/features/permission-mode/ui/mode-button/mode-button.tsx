import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ComposerOptionSelect } from "@sumi/chat-plugin";
import type { ComposerOptionProps } from "@sumi/chat-plugin";

export function ModeButton(props: ComposerOptionProps): ReactElement {
	return <ComposerOptionSelect {...props} optionKey="mode" align="start" form="round" />;
}
