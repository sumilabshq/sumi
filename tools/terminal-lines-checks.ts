import { app, orpcTransport } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import {
	ResizeTerminalCommand,
	SendTerminalCommand,
	TerminalModule,
	TerminalOutputQuery,
	TypeTerminalCommand,
} from "../apps/tauri/capabilities/terminal/index.ts";
import { MemoryTerminalSessionsGateway } from "../apps/tauri/capabilities/terminal/gateways/terminal-sessions/memory.gateway.ts";
import { TerminalModule as RunnableTerminalModule } from "../apps/tauri/capabilities/terminal/module.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const sessions = new MemoryTerminalSessionsGateway();
const served = server()
	.modules(RunnableTerminalModule.with({ sessions }))
	.start({ env: {}, host: { authenticate: new AppCallerAuthenticate() } });
const heard = {
	changes: 0,
};
served.changes(() => {
	heard.changes += 1;
});

function appOver(id: string | null): StartedApp {
	const headers = (): Record<string, string> => (id === null ? {} : { [APP_CALLER_HEADER]: id });
	return app()
		.imports(TerminalModule.over(orpcTransport("http://checks.test", { fetch: served.fetch, headers })))
		.start();
}

const notes = appOver("notes");
const other = appOver("other");
const SESSION = "s1";
const SECOND_SESSION = "s2";
const NOTES_SESSION = "notes:s1";
const NOTES_SECOND_SESSION = "notes:s2";

const before = await notes.send(TerminalOutputQuery, { session: SESSION });
check(
	"a session never opened reads an empty terminal that has not started",
	before.ok ? before.output : before.reason,
	{
		output: "",
		status: "not-started",
		exitCode: null,
	},
);

const SCREEN = {
	cols: 64,
	rows: 18,
};
const WIDER = {
	cols: 90,
	rows: 20,
};

const opened = await notes.send(ResizeTerminalCommand, { session: SESSION, ...SCREEN });
const afterOpen = await notes.send(TerminalOutputQuery, { session: SESSION });
check(
	"the first resize opens the session at the screen's size before any line is typed",
	[opened.ok, afterOpen.ok ? afterOpen.output : afterOpen.reason, sessions.sizeOf(NOTES_SESSION)],
	[
		true,
		{
			output: "",
			status: "running",
			exitCode: null,
		},
		SCREEN,
	],
);

const resized = await notes.send(ResizeTerminalCommand, { session: SESSION, ...WIDER });
check(
	"a resize of a running session only resizes it",
	[resized.ok, sessions.sizeOf(NOTES_SESSION), sessions.startCountOf(NOTES_SESSION)],
	[true, WIDER, 1],
);

const typed = await notes.send(TypeTerminalCommand, { session: SESSION, keys: "l\t\u0003" });
const afterTyped = await notes.send(TerminalOutputQuery, { session: SESSION });
check(
	"typed keys reach the session raw, with no line ending added",
	[typed.ok, afterTyped.ok ? afterTyped.output.output : afterTyped.reason],
	[true, "l\t\u0003"],
);

const sent = await notes.send(SendTerminalCommand, { session: SESSION, line: "ls -la; echo 'quoted $HOME'" });
const after = await notes.send(TerminalOutputQuery, { session: SESSION });
check(
	"the line reaches the session exactly as typed",
	after.ok ? after.output.output : after.reason,
	"l\t\u0003ls -la; echo 'quoted $HOME'\r\n",
);
check(
	"the command is answered ok and the same session runs",
	[sent.ok, after.ok ? after.output.status : after.reason, sessions.startCountOf(NOTES_SESSION)],
	[true, "running", 1],
);

const secondBefore = await notes.send(TerminalOutputQuery, { session: SECOND_SESSION });
await notes.send(ResizeTerminalCommand, { session: SECOND_SESSION, ...SCREEN });
await notes.send(SendTerminalCommand, { session: SECOND_SESSION, line: "pwd" });
const secondAfter = await notes.send(TerminalOutputQuery, { session: SECOND_SESSION });
const firstAfterSecond = await notes.send(TerminalOutputQuery, { session: SESSION });
check(
	"a second session id of the same app has a shell of its own",
	[
		secondBefore.ok ? secondBefore.output.status : secondBefore.reason,
		secondAfter.ok ? secondAfter.output.output : secondAfter.reason,
		firstAfterSecond.ok ? firstAfterSecond.output.output : firstAfterSecond.reason,
		sessions.startCountOf(NOTES_SECOND_SESSION),
	],
	["not-started", "pwd\r\n", "l\t\u0003ls -la; echo 'quoted $HOME'\r\n", 1],
);

const othersOutput = await other.send(TerminalOutputQuery, { session: SESSION });
check(
	"another app does not read this app's terminal, even with the same session id",
	othersOutput.ok ? othersOutput.output.output : othersOutput.reason,
	"",
);
check("output changes reach the server's listeners", await waitFor(() => heard.changes > 0), true);

const anonymous = await appOver(null).send(TerminalOutputQuery, { session: SESSION });
check("a caller with no app is refused", anonymous.ok ? "read" : anonymous.code, "unauthenticated");

console.log(tally.failed ? `terminal lines: ${tally.failed} check(s) failed` : "terminal lines: all checks passed");
process.exit(tally.failed ? 1 : 0);
