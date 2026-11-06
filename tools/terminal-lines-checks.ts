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

const before = await notes.send(TerminalOutputQuery);
check("an app with no session reads an empty terminal that has not started", before.ok ? before.output : before.reason, {
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

const started = await notes.send(StartTerminalCommand, SCREEN);
const afterStart = await notes.send(TerminalOutputQuery);
check(
	"starting opens the session at the screen's size before any line is typed",
	[started.ok, afterStart.ok ? afterStart.output : afterStart.reason, sessions.sizeOf("notes")],
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

const startedAgain = await notes.send(StartTerminalCommand, SCREEN);
check(
	"a second start keeps the running session",
	[startedAgain.ok, sessions.startCountOf("notes")],
	[true, 1],
);

const resized = await notes.send(ResizeTerminalCommand, WIDER);
check("a resize reaches the session", [resized.ok, sessions.sizeOf("notes")], [true, WIDER]);

const typed = await notes.send(TypeTerminalCommand, { keys: "l\t\u0003" });
const afterTyped = await notes.send(TerminalOutputQuery);
check(
	"typed keys reach the session raw, with no line ending added",
	[typed.ok, afterTyped.ok ? afterTyped.output.output : afterTyped.reason],
	[true, "l\t\u0003"],
);

const sent = await notes.send(SendTerminalCommand, { line: "ls -la; echo 'quoted $HOME'" });
const after = await notes.send(TerminalOutputQuery);
check(
	"the line reaches the session exactly as typed",
	after.ok ? after.output.output : after.reason,
	"l\t\u0003ls -la; echo 'quoted $HOME'\r\n",
);
check(
	"the command is answered ok and the same session runs",
	[sent.ok, after.ok ? after.output.status : after.reason, sessions.startCountOf("notes")],
	[true, "running", 1],
);

const othersOutput = await other.send(TerminalOutputQuery);
check(
	"another app does not read this app's terminal",
	othersOutput.ok ? othersOutput.output.output : othersOutput.reason,
	"",
);
check("output changes reach the server's listeners", await waitFor(() => heard.changes > 0), true);

const anonymous = await appOver(null).send(TerminalOutputQuery);
check("a caller with no app is refused", anonymous.ok ? "read" : anonymous.code, "unauthenticated");

console.log(tally.failed ? `terminal lines: ${tally.failed} check(s) failed` : "terminal lines: all checks passed");
process.exit(tally.failed ? 1 : 0);
