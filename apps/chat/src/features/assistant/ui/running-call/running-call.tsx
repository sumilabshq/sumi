import { createElement as h } from "react";
import type { ReactElement } from "react";
import { doingTextOf } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { BusyMark } from "../busy-mark/busy-mark.js";
import { saidElapsed } from "../../lib/spent.js";
import { useTicking } from "../../lib/use-ticking.js";

export interface RunningCallProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
}

export function RunningCall({ call, face }: RunningCallProps): ReactElement {
	useTicking();
	return (
		<div className="wg-studio-ai-busy" aria-live="polite">
			<BusyMark state="working" />
			<span className="wg-studio-ai-busy-said">{doingTextOf(face)}</span>
			<span className="wg-studio-ai-busy-took">{saidElapsed(Date.now() - call.at)}</span>
		</div>
	);
}
