export const STUDIO_MARK = "[widgetarium]";
const LEVELS = ["info", "warn", "error"] as const;

export type LogLevel = (typeof LEVELS)[number];

export type SendLogLine = (level: LogLevel, line: string) => Promise<unknown>;

export type LoggedConsole = Pick<Console, LogLevel>;

export interface StudioLogAsk {
	readonly send: SendLogLine;
	readonly logged: LoggedConsole;
	readonly page: EventTarget;
}

export function forwardStudioLogs({ send, logged, page }: StudioLogAsk): void {
	const original = {
		info: logged.info,
		warn: logged.warn,
		error: logged.error,
	};
	const forward = (level: LogLevel, line: string): void => {
		void send(level, line).catch((failure: unknown) =>
			original.warn.call(logged, "studio log line not forwarded", failure),
		);
	};

	for (const level of LEVELS) {
		logged[level] = (...parts: unknown[]): void => {
			original[level].apply(logged, parts);

			if (typeof parts[0] === "string" && parts[0].startsWith(STUDIO_MARK)) {
				forward(level, parts.map(textOf).join(" "));
			}
		};
	}

	page.addEventListener("error", (event) => forward("error", `${STUDIO_MARK} uncaught ${uncaughtTextOf(event)}`));
	page.addEventListener("unhandledrejection", (event) =>
		forward("error", `${STUDIO_MARK} unhandled rejection ${textOf(Reflect.get(event, "reason"))}`),
	);
}

function uncaughtTextOf(event: Event): string {
	if (!(event instanceof ErrorEvent)) {
		return event.type;
	}

	return `${textOf(event.error ?? event.message)} at ${event.filename}:${event.lineno}`;
}

function textOf(part: unknown): string {
	if (typeof part === "string") {
		return part;
	}

	if (part instanceof Error) {
		return `${part.name}: ${part.message}${part.stack === undefined ? "" : `\n${part.stack}`}`;
	}

	try {
		return JSON.stringify(part) ?? String(part);
	} catch {
		return String(part);
	}
}
