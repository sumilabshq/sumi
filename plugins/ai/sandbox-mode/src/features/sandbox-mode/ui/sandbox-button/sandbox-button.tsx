import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ComposerOptionSelect } from "@sumi/chat-plugin";
import type { ComposerOptionProps } from "@sumi/chat-plugin";

export function SandboxButton(props: ComposerOptionProps): ReactElement {
	return <ComposerOptionSelect {...props} optionKey="sandbox" align="start" />;
}
