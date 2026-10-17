import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { doingTextOf } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantCall, AssistantSession, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { saidElapsed } from "./spent.js";
import { useTicking } from "./use-ticking.js";

export interface RunningCallProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly onStop: () => void;
}

const STOP = "Stop";
const RUNNING_SAID = "{doing}…";

export function runningCallOf(session: AssistantSession): AssistantCall | null {
	if (!session.busy) {
		return null;
	}

	const last = session.turns.at(-1)?.calls.at(-1);
	return last && !last.answered ? last : null;
}

export function RunningCall({ call, face, onStop }: RunningCallProps): ReactElement {
	useTicking();
	return h("div", { className: "wg-studio-ai-running", "aria-live": "polite" }, [
		h("span", { className: "wg-studio-ai-running-mark", key: "mark" }, h(Icon, { name: "loader-circle", size: 18 })),
		h("span", { className: "wg-studio-ai-running-said", key: "said" }, runningSaidOf(face)),
		h("span", { className: "wg-studio-ai-running-took", key: "took" }, saidElapsed(Date.now() - call.at)),
		h("button", { className: "wg-studio-ai-pill", key: "stop", type: "button", onClick: onStop }, STOP),
	]);
}

function runningSaidOf(face: CallFace): string {
	return RUNNING_SAID.replace("{doing}", doingTextOf(face));
}
