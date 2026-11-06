import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { callVerbOf } from "./call-verb.js";
import { knownFacesOf } from "./known-face.js";
import { toolsSummaryOf } from "./tools-summary.js";

export interface LiveSaid {
	readonly done: string;
	readonly now: string;
}

const DOING = "{verb} {object}";
const DONE_THEN = "{done}, ";

// TRADE-OFF: done and now are two spans of one sentence, because they are painted in two colours
export function liveSaidOf(calls: readonly AssistantCall[], faces: readonly CallFace[], waiting: string): LiveSaid {
	const known = knownFacesOf(calls, faces);
	const done = toolsSummaryOf(known.filter((_, at) => calls[at]?.answered === true));
	const running = known[calls.map((call) => call.answered).lastIndexOf(false)];

	if (!running) {
		return {
			done: done === "" ? waiting : done,
			now: "",
		};
	}

	const now = DOING.replace("{verb}", callVerbOf(running, false)).replace("{object}", running.object);

	if (done === "") {
		return {
			done: "",
			now,
		};
	}

	return {
		done: DONE_THEN.replace("{done}", done),
		now: now.charAt(0).toLowerCase() + now.slice(1),
	};
}
