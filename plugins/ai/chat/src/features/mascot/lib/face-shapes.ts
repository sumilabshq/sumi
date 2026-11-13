import type { MascotState } from "./mascot-state.schema.js";

const OPEN_EYE = "M0 -9 Q0 0 0 9";
const SMILING_EYE = "M-4.5 3 Q0 -6 4.5 3";
const SHUT_MOUTH = "M-3.5 0 Q0 0 3.5 0";

export const EYE_PATHS: Readonly<Record<MascotState, string>> = {
	idle: OPEN_EYE,
	listening: OPEN_EYE,
	thinking: "M0 -5 Q0 0 0 5",
	working: "M0 0.5 Q0 2 0 3.5",
	done: SMILING_EYE,
	pleased: SMILING_EYE,
	question: "M0 -1.5 Q0 0 0 1.5",
	error: "M0 -6 Q0 0.5 0 7",
	sleep: "M-4 3 Q0 6 4 3",
	surprised: "M0 -13 Q0 0 0 12",
};

export const MOUTH_PATHS: Readonly<Record<MascotState, string>> = {
	idle: SHUT_MOUTH,
	listening: SHUT_MOUTH,
	thinking: SHUT_MOUTH,
	working: SHUT_MOUTH,
	done: "M-4 -2.5 Q0 2.5 4 -2.5",
	pleased: SHUT_MOUTH,
	question: "M-1.5 0 Q0 -1.5 1.5 0",
	error: "M-4 2.5 Q0 -2.5 4 2.5",
	sleep: SHUT_MOUTH,
	surprised: "M0 -1 Q0 0 0 1",
};
