import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { Fold } from "../fold/fold.js";
import { CallRows } from "./call-rows.js";
import { ToolsHead } from "./tools-head.js";

export interface ToolCallsProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
}

export function ToolCalls({ calls, faces }: ToolCallsProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	return (
		<div className="wg-studio-ai-tools">
			<ToolsHead calls={calls} faces={faces} isOpen={isOpen} onToggle={() => setOpen(!isOpen)} />
			<Fold isOpen={isOpen}>
				<CallRows calls={calls} faces={faces} />
			</Fold>
		</div>
	);
}
