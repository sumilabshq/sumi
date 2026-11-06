import { app, orpcTransport } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import {
	ResizeTerminalCommand,
	SendTerminalCommand,
	StartTerminalCommand,
	TerminalModule,
	TerminalOutputQuery,
	TypeTerminalCommand,
} from "../packages/domain/terminal/index.ts";
import { MemoryTerminalSessionsGateway } from "../packages/domain/terminal/gateways/terminal-sessions/memory.gateway.ts";
import { TerminalModule as RunnableTerminalModule } from "../packages/domain/terminal/module.ts";
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
const TAB = "t1";
const SECOND_TAB = "t2";
const NOTES_TAB_SESSION = "notes:t1";
const NOTES_SECOND_TAB_SESSION = "notes:t2";

const before = await notes.send(TerminalOutputQuery, { tab: TAB });
check("a tab with no session reads an empty terminal that has not started", before.ok ? before.output : before.reason, {
	output: "",
	status: "not-started",
	exitCode: null,
});

const SCREEN = {
	cols: 64,
	rows: 18,
};
const WIDER = {
	cols: 90,
	rows: 20,
};

const started = await notes.send(StartTerminalCommand, { tab: TAB, ...SCREEN });
const afterStart = await notes.send(TerminalOutputQuery, { tab: TAB });
check(
	"starting opens the session at the screen's size before any line is typed",
	[started.ok, afterStart.ok ? afterStart.output : afterStart.reason, sessions.sizeOf(NOTES_TAB_SESSION)],
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

const startedAgain = await notes.send(StartTerminalCommand, { tab: TAB, ...SCREEN });
check(
	"a second start keeps the running session",
	[startedAgain.ok, sessions.startCountOf(NOTES_TAB_SESSION)],
	[true, 1],
);

const resized = await notes.send(ResizeTerminalCommand, { tab: TAB, ...WIDER });
check("a resize reaches the session", [resized.ok, sessions.sizeOf(NOTES_TAB_SESSION)], [true, WIDER]);

const typed = await notes.send(TypeTerminalCommand, { tab: TAB, keys: "l\t\u0003" });
const afterTyped = await notes.send(TerminalOutputQuery, { tab: TAB });
check(
	"typed keys reach the session raw, with no line ending added",
	[typed.ok, afterTyped.ok ? afterTyped.output.output : afterTyped.reason],
	[true, "l\t\u0003"],
);

const sent = await notes.send(SendTerminalCommand, { tab: TAB, line: "ls -la; echo 'quoted $HOME'" });
const after = await notes.send(TerminalOutputQuery, { tab: TAB });
check(
	"the line reaches the session exactly as typed",
	after.ok ? after.output.output : after.reason,
	"l\t\u0003ls -la; echo 'quoted $HOME'\r\n",
);
check(
	"the command is answered ok and the same session runs",
	[sent.ok, after.ok ? after.output.status : after.reason, sessions.startCountOf(NOTES_TAB_SESSION)],
	[true, "running", 1],
);

const secondBefore = await notes.send(TerminalOutputQuery, { tab: SECOND_TAB });
await notes.send(StartTerminalCommand, { tab: SECOND_TAB, ...SCREEN });
await notes.send(SendTerminalCommand, { tab: SECOND_TAB, line: "pwd" });
const secondAfter = await notes.send(TerminalOutputQuery, { tab: SECOND_TAB });
const firstAfterSecond = await notes.send(TerminalOutputQuery, { tab: TAB });
check(
	"a second tab of the same app has a shell of its own",
	[
		secondBefore.ok ? secondBefore.output.status : secondBefore.reason,
		secondAfter.ok ? secondAfter.output.output : secondAfter.reason,
		firstAfterSecond.ok ? firstAfterSecond.output.output : firstAfterSecond.reason,
		sessions.startCountOf(NOTES_SECOND_TAB_SESSION),
	],
	["not-started", "pwd\r\n", "l\t\u0003ls -la; echo 'quoted $HOME'\r\n", 1],
);

const othersOutput = await other.send(TerminalOutputQuery, { tab: TAB });
check(
	"another app does not read this app's terminal, even with the same tab id",
	othersOutput.ok ? othersOutput.output.output : othersOutput.reason,
	"",
);
check("output changes reach the server's listeners", await waitFor(() => heard.changes > 0), true);

const anonymous = await appOver(null).send(TerminalOutputQuery, { tab: TAB });
check("a caller with no app is refused", anonymous.ok ? "read" : anonymous.code, "unauthenticated");

console.log(tally.failed ? `terminal lines: ${tally.failed} check(s) failed` : "terminal lines: all checks passed");
process.exit(tally.failed ? 1 : 0);
