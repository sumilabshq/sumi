import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallRows } from "./call-rows.js";
import { ToolsHead } from "./tools-head.js";

export interface ToolCallsProps {
	readonly calls: readonly AssistantCall[];
	readonly describe: (call: AssistantCall) => CallFace;
}

export function ToolCalls({ calls, describe }: ToolCallsProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const head = h(ToolsHead, { key: "head", calls, isOpen, onToggle: () => setOpen(!isOpen) });
	if (!isOpen) {
		return h("div", { className: "wg-studio-ai-tools" }, head);
	}

	return h("div", { className: "wg-studio-ai-tools is-open" }, [head, h(CallRows, { key: "list", calls, describe })]);
}
