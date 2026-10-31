import { app, orpcTransport } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { SendTerminalCommand, TerminalModule, TerminalOutputQuery } from "../packages/domain/terminal/index.ts";
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
check("an app with no session reads an empty, stopped terminal", before.ok ? before.output : before.reason, {
	output: "",
	isRunning: false,
	exitCode: null,
});

const sent = await notes.send(SendTerminalCommand, { line: "ls -la; echo 'quoted $HOME'" });
const after = await notes.send(TerminalOutputQuery);
check(
	"the line reaches the session exactly as typed",
	after.ok ? after.output.output : after.reason,
	"ls -la; echo 'quoted $HOME'\r\n",
);
check("the command is answered ok and the session runs", [sent.ok, after.ok && after.output.isRunning], [true, true]);

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
