import type { SumiState } from "./sumi-state.js";

export type SumiMood =
	| "idle"
	| "listening"
	| "thinking"
	| "working"
	| "done"
	| "question"
	| "error"
	| "sleep"
	| "pleased"
	| "surprised";

const STATE_OF: Readonly<Record<SumiMood, SumiState>> = {
	idle: "rest",
	listening: "listening",
	thinking: "working",
	working: "working",
	done: "done",
	question: "waits",
	error: "error",
	sleep: "asleep",
	pleased: "rest",
	surprised: "surprised",
};

export function sumiStateOf(mood: SumiMood): SumiState {
	return STATE_OF[mood];
}
