import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallRows } from "./call-rows.js";
import { ToolsHead } from "./tools-head.js";

export interface ToolCallsProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
}

export function ToolCalls({ calls, faces }: ToolCallsProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	return (
		<div className={isOpen ? "wg-studio-ai-tools is-open" : "wg-studio-ai-tools"}>
			<ToolsHead calls={calls} isOpen={isOpen} onToggle={() => setOpen(!isOpen)} />
			{isOpen ? <CallRows calls={calls} faces={faces} /> : null}
		</div>
	);
}
