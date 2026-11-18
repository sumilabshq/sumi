export const STATUS_CUBE_STATES = ["idle", "working", "question", "blocked", "done"] as const;

export type StatusCubeState = (typeof STATUS_CUBE_STATES)[number];

export const STATUS_CUBE_SAID: Readonly<Record<StatusCubeState, string>> = {
	idle: "Idle",
	working: "Working",
	question: "Waiting for an answer",
	blocked: "Blocked",
	done: "Done",
};
