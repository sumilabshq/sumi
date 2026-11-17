export const STUDIO_MARK = "[widgetarium]";
const KEPT_LEVELS = ["info", "warn", "error"] as const;
const VERBOSE_METHODS = ["debug", "log"] as const;

export type LogLevel = (typeof KEPT_LEVELS)[number] | "debug";

export interface LogContext {
	readonly workspace?: string;
	readonly tab?: string;
	readonly chat?: string;
}

export interface SentLogLine extends LogContext {
	readonly level: LogLevel;
	readonly line: string;
	readonly data: readonly unknown[] | null;
}

export type SendLogLine = (sent: SentLogLine) => Promise<unknown>;

export type LoggedConsole = Pick<Console, (typeof KEPT_LEVELS)[number] | (typeof VERBOSE_METHODS)[number]>;

export interface StudioLogAsk {
	readonly send: SendLogLine;
	readonly logged: LoggedConsole;
	readonly page: EventTarget;
	readonly contextOf: () => LogContext;
	readonly isVerbose: () => boolean;
}

export function forwardStudioLogs({ send, logged, page, contextOf, isVerbose }: StudioLogAsk): void {
	const original = {
		info: logged.info,
		warn: logged.warn,
		error: logged.error,
		debug: logged.debug,
		log: logged.log,
	};
	const notForwarded = (failure: unknown): void => {
		original.warn.call(logged, "studio log line not forwarded", failure);
	};
	const forward = (level: LogLevel, parts: readonly unknown[]): void => {
		const [first, ...rest] = parts;

		try {
			void send({
				...contextOf(),
				level,
				line: textOf(first),
				data: rest.length === 0 ? null : rest.map(sendableOf),
			}).catch(notForwarded);
		} catch (failure) {
			notForwarded(failure);
		}
	};

	for (const level of KEPT_LEVELS) {
		logged[level] = (...parts: unknown[]): void => {
			original[level].apply(logged, parts);
			forward(level, parts);
		};
	}

	for (const method of VERBOSE_METHODS) {
		logged[method] = (...parts: unknown[]): void => {
			original[method].apply(logged, parts);

			if (isVerbose()) {
				forward("debug", parts);
			}
		};
	}

	page.addEventListener("error", (event) => forward("error", [`${STUDIO_MARK} uncaught ${uncaughtTextOf(event)}`]));
	page.addEventListener("unhandledrejection", (event) =>
		forward("error", [`${STUDIO_MARK} unhandled rejection`, Reflect.get(event, "reason")]),
	);
}

function uncaughtTextOf(event: Event): string {
	if (!(event instanceof ErrorEvent)) {
		return event.type;
	}

	return `${textOf(event.error ?? event.message)} at ${event.filename}:${event.lineno}`;
}

function sendableOf(part: unknown): unknown {
	try {
		const text = JSON.stringify(part, errorsWrittenOut);
		return text === undefined ? String(part) : JSON.parse(text);
	} catch {
		return Object.prototype.toString.call(part);
	}
}

function errorsWrittenOut(_key: string, value: unknown): unknown {
	if (!(value instanceof Error)) {
		return value;
	}

	return {
		name: value.name,
		message: value.message,
		stack: value.stack ?? null,
	};
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
