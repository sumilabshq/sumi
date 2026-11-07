import { CallLoggerMiddleware, PerCall, Repeatable, guard, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import type { User } from "@widgetarium/data-framework";
import { TerminalOutputChangedEvent } from "../../gateways/terminal-sessions/terminal-sessions.events.js";
import { ResizeTerminalInputSchema, SendTerminalInputSchema, TerminalOutputSchema, TerminalSessionSchema, TypeTerminalInputSchema } from "../../shared/schema/terminal.schema.js";

const CHARS_SENT = "({chars} chars)";
const NO_APP = "only an app has a terminal: the call carries no app";
const SESSION_OF_APP = "{app}:{session}";

// TODO: per-app grants (which commands may run); every app may type anything today
export const TerminalAccessGuard = guard()
	.needsUser()
	.handle(() => undefined);

export const TerminalCallLoggerMiddleware = CallLoggerMiddleware("terminal", (input) =>
	CHARS_SENT.replace("{chars}", String(charsOf(input))),
);

export const TerminalOutputQuery = query("terminal-output")
	.public()
	.input(TerminalSessionSchema)
	.output(TerminalOutputSchema)
	.handle(({ session }, { sessions, user }) => sessions.outputOf(sessionOf(user, session)));

export const ResizeTerminalCommand = command("resize-terminal")
	.public()
	.input(ResizeTerminalInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ session, cols, rows }, { sessions, user, invalidate }) => {
		const owned = sessionOf(user, session);

		if (sessions.outputOf(owned).status === "not-started") {
			await sessions.start(owned, { cols, rows });
			invalidate(TerminalOutputQuery);
			return;
		}

		await sessions.resize(owned, { cols, rows });
	});

export const TypeTerminalCommand = command("type-terminal")
	.public()
	.input(TypeTerminalInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ session, keys }, { sessions, user }) => {
		await sessions.type(sessionOf(user, session), keys);
	});

export const SendTerminalCommand = command("send-terminal")
	.public()
	.input(SendTerminalInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ session, line }, { sessions, user, invalidate }) => {
		await sessions.send(sessionOf(user, session), line);
		invalidate(TerminalOutputQuery);
	});

export const RereadTerminalOutputSubscriber = subscriber(TerminalOutputChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(TerminalOutputQuery);
	},
);

function sessionOf(user: User | null, session: string): string {
	if (user === null) {
		return refuse(NO_APP);
	}

	return SESSION_OF_APP.replace("{app}", user.id).replace("{session}", session);
}

function charsOf(input: unknown): number {
	return (
		SendTerminalInputSchema.safeParse(input).data?.line.length ??
		TypeTerminalInputSchema.safeParse(input).data?.keys.length ??
		0
	);
}
