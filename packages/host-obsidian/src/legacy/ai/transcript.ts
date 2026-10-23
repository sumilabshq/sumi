import type { Blocker, Tally } from "@widgetarium/core/engine/assistant-cards.js";
import { reportHeadCountsOf } from "./tools.js";
import type {
	AssistantCall,
	AssistantTurn,
	CallOutputCounts,
	TurnOutcome,
} from "@widgetarium/core/engine/assistant-port.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { isPlainObject } from "@widgetarium/core/engine/provider-stream.js";

const OUTPUT_KEPT = 2000;
const TRANSCRIPT_KEPT_BYTES = 262144;

const TURN_OUTCOMES: readonly TurnOutcome[] = ["done", "stopped", "failed"];
const TURN_DROPPED = "[widgetarium] a saved turn that is not an object was dropped from the transcript";

// TRADE-OFF: the oldest turns go rather than the longest, because a conversation read back out of order reads as somebody else's
export function turnsToKeep(turns: unknown): AssistantTurn[] {
	let kept = withOldestAnswersEmptied(savedTurnsIn(turns).map(turnToKeep));
	while (kept.length > 1 && JSON.stringify(kept).length > TRANSCRIPT_KEPT_BYTES) kept = kept.slice(1);
	return kept;
}

export function sessionToKeep(held: unknown): string | null {
	return typeof held === "string" && held !== "" ? held : null;
}

const wordsIn = (held: unknown): string => (typeof held === "string" ? held : "");
const isCount = (held: unknown): held is number => typeof held === "number" && Number.isInteger(held) && held >= 0;
const momentIn = (held: unknown): number => (isCount(held) ? held : 0);

function savedTurnsIn(turns: unknown): Readonly<Record<string, unknown>>[] {
	const saved = Array.isArray(turns) ? turns : [];
	const objects = saved.filter(isObject);
	if (objects.length < saved.length) {
		console.warn(TURN_DROPPED, saved.length - objects.length);
	}

	return objects;
}

function callToKeep(given: unknown): AssistantCall {
	const call = isObject(given) ? given : {};
	const input = call["input"];
	const kept = { name: wordsIn(call["name"]), input: isPlainObject(input) ? input : {} };
	const output = wordsIn(call["output"]).slice(0, OUTPUT_KEPT);
	return {
		ref: wordsIn(call["ref"]),
		name: wordsIn(call["name"]),
		input: isPlainObject(input) ? input : {},
		output,
		answered: call["answered"] === true,
		failed: call["failed"] === true,
		at: momentIn(call["at"]),
		answeredAt: momentIn(call["answeredAt"]),
		...(outputCountsPartOf(call["outputCounts"]) ?? countedOnReadOf(kept, output)),
	};
}

function countedOnReadOf(
	call: Pick<AssistantCall, "name" | "input">,
	output: string,
): { readonly outputCounts?: CallOutputCounts } {
	const outputCounts = reportHeadCountsOf(call, output);
	return outputCounts ? { outputCounts } : {};
}

function outputCountsPartOf(held: unknown): { readonly outputCounts?: CallOutputCounts } | null {
	if (!isObject(held)) {
		return null;
	}

	const { lines, hits } = held;
	const features = tallyIn(held["features"]);
	const blockedBy = blockerIn(held["blockedBy"]);
	const outputCounts: CallOutputCounts = {
		...(isCount(lines) ? { lines } : {}),
		...(isCount(hits) ? { hits } : {}),
		...(features ? { features } : {}),
		...(blockedBy ? { blockedBy } : {}),
	};
	return Object.keys(outputCounts).length === 0 ? null : { outputCounts };
}

function tallyIn(held: unknown): Tally | null {
	if (!isObject(held)) {
		return null;
	}

	const { passed, all } = held;
	return isCount(passed) && isCount(all) && passed <= all ? { passed, all } : null;
}

function blockerIn(held: unknown): Blocker | null {
	if (!isObject(held)) {
		return null;
	}

	const { feature, why } = held;
	return typeof feature === "string" && typeof why === "string" ? { feature, why } : null;
}

function turnToKeep(turn: Readonly<Record<string, unknown>>): AssistantTurn {
	const calls = turn["calls"];
	const outcome = TURN_OUTCOMES.find((known) => known === turn["outcome"]);
	return {
		role: turn["role"] === "user" ? "user" : "agent",
		text: wordsIn(turn["text"]),
		calls: Array.isArray(calls) ? calls.map(callToKeep) : [],
		...momentsIn(turn),
		...(outcome ? { outcome } : {}),
	};
}

function momentsIn(turn: Readonly<Record<string, unknown>>): Pick<AssistantTurn, "startedAt" | "endedAt"> {
	const startedAt = momentIn(turn["startedAt"]);
	const endedAt = momentIn(turn["endedAt"]);
	return startedAt > 0 && endedAt >= startedAt ? { startedAt, endedAt } : {};
}

function withOldestAnswersEmptied(turns: AssistantTurn[]): AssistantTurn[] {
	let over = JSON.stringify(turns).length - TRANSCRIPT_KEPT_BYTES;
	if (over <= 0) return turns;
	return turns.map((turn) => ({
		...turn,
		calls: turn.calls.map((call) => {
			if (over <= 0 || call.output === "") return call;
			over -= call.output.length;
			return { ...call, output: "" };
		}),
	}));
}
