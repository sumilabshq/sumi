import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ComposerOptionSelect } from "@sumi/chat-plugin";
import type { ComposerOptionProps } from "@sumi/chat-plugin";

const MODE_ICONS = {
	manual: "hand",
	acceptEdits: "pencil",
	auto: "zap",
	plan: "list-checks",
} as const;

export function ModeButton(props: ComposerOptionProps): ReactElement {
	return <ComposerOptionSelect {...props} optionKey="mode" align="start" form="round" icons={MODE_ICONS} />;
}
