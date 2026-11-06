import { forwardStudioLogs } from "../apps/tauri/src/studio-log.ts";
import type { LogLevel, LoggedConsole } from "../apps/tauri/src/studio-log.ts";
import { check, tally } from "./check-helpers.ts";

const sent: string[] = [];
const printed: string[] = [];
const printer =
	(level: LogLevel) =>
	(...parts: unknown[]): void => {
		printed.push(`${level} ${parts.map(String).join(" ")}`);
	};
const logged: LoggedConsole = {
	info: printer("info"),
	warn: printer("warn"),
	error: printer("error"),
};
const page = new EventTarget();
forwardStudioLogs({
	send: async (level, line) => {
		sent.push(`${level} ${line}`);
	},
	logged,
	page,
});

logged.info("[widgetarium] tab drag of tab-3 none → lifted (native drag started)");
logged.warn("[widgetarium] refused", { reason: "no page" });
logged.error("[widgetarium] failed", new Error("boom"));
logged.info("a page said something");
const rejection = new Event("unhandledrejection");
Reflect.set(rejection, "reason", "lost");
page.dispatchEvent(rejection);
await Promise.resolve();

check("a studio line reaches the host with its level and its parts written out", sent.slice(0, 2), [
	"info [widgetarium] tab drag of tab-3 none → lifted (native drag started)",
	'warn [widgetarium] refused {"reason":"no page"}',
]);
check("an error part is written with its message", sent[2]?.startsWith("error [widgetarium] failed Error: boom"), true);
check(
	"a line that is not the studio's never leaves the console",
	sent.some((line) => line.includes("a page said")),
	false,
);
check(
	"an unhandled rejection reaches the host as a studio line",
	sent.at(-1),
	"error [widgetarium] unhandled rejection lost",
);
check("the console still prints every line", printed.length, 4);

console.log(tally.failed === 0 ? "studio log: all checks pass" : `studio log: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
