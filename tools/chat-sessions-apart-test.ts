import { ChatSessions, ONE_CHAT_LINK } from "../apps/host-tauri/src/assistant/chat-sessions.ts";
import type { RunAnswer, TurnRun } from "../apps/host-tauri/src/assistant/turn-run.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

interface HeldRun {
	readonly run: TurnRun;
	readonly finish: () => void;
}

function heldRun(): HeldRun {
	const held: { finish: (answer: RunAnswer) => void } = { finish: () => undefined };
	const done = new Promise<RunAnswer>((finish) => {
		held.finish = finish;
	});
	return {
		run: { stop: () => undefined, done },
		finish: () => held.finish({ failure: null }),
	};
}

const runs: HeldRun[] = [];
const sessions = new ChatSessions(ONE_CHAT_LINK, async () => {
	const held = heldRun();
	runs.push(held);
	return { run: held.run, providerId: "claude-code", resumesWithoutAnId: false };
});
const heardFirst: number[] = [];
const heardSecond: number[] = [];
sessions.watchChat("first", () => heardFirst.push(sessions.nowOf("first").turns.length));
sessions.watchChat("second", () => heardSecond.push(sessions.nowOf("second").turns.length));

await (await sessions.sessionOf("first")).send("Plan the release");
await waitFor(() => runs.length === 1);
check("a chat pane's ask runs in its own chat", sessions.nowOf("first").turns.length > 0, true);
check("the other chat pane stays empty", sessions.nowOf("second").turns.length, 0);
check(
	"only the first chat's watchers hear it",
	heardFirst.length > 0 && heardSecond.every((turns) => turns === 0),
	true,
);

await (await sessions.sessionOf("second")).send("Draft the notes");
await waitFor(() => runs.length === 2);
check("two chats can run at the same time", runs.length, 2);
runs[0]?.finish();
runs[1]?.finish();
await waitFor(() => !sessions.nowOf("first").busy && !sessions.nowOf("second").busy);
check(
	"each chat keeps its own conversation",
	[sessions.nowOf("first").turns[0]?.role, sessions.nowOf("second").turns.length],
	["user", 2],
);
process.exit(tally.failed === 0 ? 0 : 1);
