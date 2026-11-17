import { forwardStudioLogs } from "../apps/tauri/src/studio-log.ts";
import type { LogContext, LogLevel, LoggedConsole, SentLogLine } from "../apps/tauri/src/studio-log.ts";
import { setRequestTracing, traceRequest } from "../packages/shared/data-framework/src/request-tracing.ts";
import { check, tally } from "./check-helpers.ts";

const sent: SentLogLine[] = [];
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
	debug: printer("debug"),
	log: printer("log"),
};
const page = new EventTarget();
let context: LogContext = { workspace: "w-1" };
let isVerbose = false;
forwardStudioLogs({
	send: async (line) => {
		sent.push(line);
	},
	logged,
	page,
	contextOf: () => context,
	isVerbose: () => isVerbose,
});

logged.info("[widgetarium] tab drag of tab-3 none → lifted (native drag started)");
context = {
	workspace: "w-1",
	tab: "tab-3",
	chat: "chat-9",
};
logged.warn("[ink] refused", { reason: "no page" });
logged.error("[studio] failed", new Error("boom"));
const circular: Record<string, unknown> = {};
circular["self"] = circular;
logged.info("a line of any prefix", circular);
const rejection = new Event("unhandledrejection");
Reflect.set(rejection, "reason", "lost");
page.dispatchEvent(rejection);
await Promise.resolve();
const beforeVerbose = sent.length;
logged.debug("[widgetarium] chatty while quiet");
logged.log("[widgetarium] a log while quiet");
const quietSent = sent.length - beforeVerbose;
isVerbose = true;
logged.debug("[widgetarium] chatty while verbose");
logged.log("[widgetarium] a log while verbose");
const verboseSent = sent.slice(beforeVerbose);
const savedConsole = globalThis.console;
globalThis.console = { ...savedConsole, ...logged };
traceRequest(
	"tabs.open",
	{ url: "x" },
	{ ok: false, code: "failed", reason: "no page", ran: false },
	performance.now(),
);
traceRequest("tabs.all", {}, { ok: true, output: [] }, performance.now());
setRequestTracing(true);
traceRequest("tabs.all", { pinned: true }, { ok: true, output: [] }, performance.now());
setRequestTracing(false);
globalThis.console = savedConsole;
const traced = sent.slice(beforeVerbose + verboseSent.length);
isVerbose = false;
logged.error("[widgetarium] x refused", { ran: false, thrown: new Error("deep") });
const nested = sent.at(-1)?.data?.[0];
const savedContext = context;
let wasThrownToCaller = false;
try {
	context = new Proxy(savedContext, {
		ownKeys: () => {
			throw new Error("context broke");
		},
	});
	logged.warn("[widgetarium] while the context breaks");
} catch {
	wasThrownToCaller = true;
}
context = savedContext;

check("a line reaches the host with its level, text and the context of that moment", sent[0], {
	workspace: "w-1",
	level: "info",
	line: "[widgetarium] tab drag of tab-3 none → lifted (native drag started)",
	data: null,
});
check("the parts after the text travel as data, with the shown tab and chat", sent[1], {
	workspace: "w-1",
	tab: "tab-3",
	chat: "chat-9",
	level: "warn",
	line: "[ink] refused",
	data: [{ reason: "no page" }],
});
check(
	"an error part travels as its name, message and stack",
	Reflect.get(Object(sent[2]?.data?.[0]), "message"),
	"boom",
);
check("a line without the studio mark is forwarded too", sent[3]?.line, "a line of any prefix");
check("a part JSON cannot write travels as text", sent[3]?.data, ["[object Object]"]);
check(
	"an unhandled rejection reaches the host with its reason",
	[sent[4]?.line, sent[4]?.data],
	["[widgetarium] unhandled rejection", ["lost"]],
);
check("debug and log stay out of the host while it keeps no debug", quietSent, 0);
check(
	"debug and log reach the host as debug once it keeps debug",
	verboseSent.map((line) => `${line.level} ${line.line}`),
	["debug [widgetarium] chatty while verbose", "debug [widgetarium] a log while verbose"],
);
check(
	"a refused request is a warning carrying its input; an answered one is traced only while tracing is on",
	traced.map((line) => [line.level, line.line.replace(/\d+ms/u, "Nms"), line.data]),
	[
		["warn", "[request] tabs.open → refused (failed) in Nms: no page", [{ input: { url: "x" } }]],
		["debug", "[request] tabs.all → ok in Nms", [{ input: { pinned: true } }]],
	],
);
check(
	"an error nested in data keeps its message",
	Reflect.get(Object(Reflect.get(Object(nested), "thrown")), "message"),
	"deep",
);
check("a forwarding failure never throws into the caller", wasThrownToCaller, false);
check("the console still prints every line", printed.length, 13);

console.log(tally.failed === 0 ? "studio log: all checks pass" : `studio log: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
