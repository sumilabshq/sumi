import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { doingTextOf } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { saidElapsed } from "../../lib/spent.js";
import { useTicking } from "../../lib/use-ticking.js";

export interface RunningCallProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly onStop: () => void;
}

const STOP = "Stop";
const RUNNING_SAID = "{doing}…";

export function RunningCall({ call, face, onStop }: RunningCallProps): ReactElement {
	useTicking();
	return (
		<div className="wg-studio-ai-running" aria-live="polite">
			<span className="wg-studio-ai-running-mark">
				<Icon name="loader-circle" size={18} />
			</span>
			<span className="wg-studio-ai-running-said">{RUNNING_SAID.replace("{doing}", doingTextOf(face))}</span>
			<span className="wg-studio-ai-running-took">{saidElapsed(Date.now() - call.at)}</span>
			<button className="wg-studio-ai-pill" type="button" onClick={onStop}>
				{STOP}
			</button>
		</div>
	);
}
