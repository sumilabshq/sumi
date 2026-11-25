import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ComposerOptionSelect } from "@sumi/chat-plugin";
import type { ComposerOptionProps } from "@sumi/chat-plugin";

const SANDBOX_ICONS = {
	project: "shield-check",
	"read-only": "lock",
	full: "shield-alert",
} as const;

export function SandboxButton(props: ComposerOptionProps): ReactElement {
	return <ComposerOptionSelect {...props} optionKey="sandbox" align="start" icons={SANDBOX_ICONS} warnValue="full" />;
}
