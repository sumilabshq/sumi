import type { TaskStatus } from "../schema/task.schema.js";

export const STATUS_WORDS: Readonly<Record<TaskStatus, string>> = {
	backlog: "Backlog",
	todo: "To do",
	in_progress: "In progress",
	ready_to_test: "Ready to test",
	done: "Done",
	paused: "Paused",
	blocked: "Blocked",
	cancelled: "Cancelled",
};

export const STATUS_GUIDE: Readonly<Record<TaskStatus, string>> = {
	backlog: "known, not planned now; never start it without the person",
	todo: "next; any agent may start it with task_start",
	in_progress: "you are working; mark each step the moment it is done; you may not stop here",
	ready_to_test: "the person's turn; stop and say what to try and where; move it on only when they say so in this chat",
	done: "accepted; only when the person said so in this chat, their words as the note",
	paused: "put aside for the person's other ask; come back to it yourself",
	blocked: "cannot go on; the note names the blocker and what unblocks it",
	cancelled: "will not be done; only when the person said so or it is a duplicate",
};

export function statusGuideOf(statuses: readonly TaskStatus[]): string {
	return statuses.map((status) => `- ${status} (${STATUS_WORDS[status]}): ${STATUS_GUIDE[status]}`).join("\n");
}
