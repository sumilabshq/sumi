import {
	CallLoggerMiddleware,
	PerCall,
	Repeatable,
	command,
	guard,
	query,
	refuse,
	subscriber,
} from "@widgetarium/data-framework";
import type { User } from "@widgetarium/data-framework";
import { TerminalOutputChangedEvent } from "../../gateways/terminal-sessions/terminal-sessions.events.js";
import { TerminalSessionsGateway } from "../../gateways/terminal-sessions/terminal-sessions.gateway.js";
import {
	SendTerminalInputSchema,
	TerminalOutputSchema,
	TerminalSizeInputSchema,
	TerminalTabSchema,
	TypeTerminalInputSchema,
} from "../../shared/schema/terminal.schema.js";

const CHARS_SENT = "({chars} chars)";
const NO_APP = "only an app has a terminal: the call carries no app";
const SESSION_OF_TAB = "{app}:{tab}";

// TODO: per-app grants (which commands may run); every app may type anything today
export const TerminalAccessGuard = guard()
	.needsUser()
	.handle(() => undefined);

export const TerminalCallLoggerMiddleware = CallLoggerMiddleware("terminal", (input) =>
	CHARS_SENT.replace("{chars}", String(charsOf(input))),
);

export const TerminalOutputQuery = query("terminal-output")
	.input(TerminalTabSchema)
	.output(TerminalOutputSchema)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(({ tab }, { sessions, user }) => sessions.outputOf(sessionOf(user, tab)));

export const StartTerminalCommand = command("start-terminal")
	.input(TerminalSizeInputSchema)
	.idempotencyKey(Repeatable)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async ({ tab, cols, rows }, { sessions, user, invalidate }) => {
		await sessions.start(sessionOf(user, tab), { cols, rows });
		invalidate(TerminalOutputQuery);
	});

export const ResizeTerminalCommand = command("resize-terminal")
	.input(TerminalSizeInputSchema)
	.idempotencyKey(Repeatable)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async ({ tab, cols, rows }, { sessions, user }) => {
		await sessions.resize(sessionOf(user, tab), { cols, rows });
	});

export const TypeTerminalCommand = command("type-terminal")
	.input(TypeTerminalInputSchema)
	.idempotencyKey(PerCall)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async ({ tab, keys }, { sessions, user }) => {
		await sessions.type(sessionOf(user, tab), keys);
	});

export const SendTerminalCommand = command("send-terminal")
	.input(SendTerminalInputSchema)
	.idempotencyKey(PerCall)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async ({ tab, line }, { sessions, user, invalidate }) => {
		await sessions.send(sessionOf(user, tab), line);
		invalidate(TerminalOutputQuery);
	});

export const RereadTerminalOutputSubscriber = subscriber(TerminalOutputChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(TerminalOutputQuery);
	},
);

function sessionOf(user: User | null, tab: string): string {
	if (user === null) {
		return refuse(NO_APP);
	}

	return SESSION_OF_TAB.replace("{app}", user.id).replace("{tab}", tab);
}

function charsOf(input: unknown): number {
	return (
		SendTerminalInputSchema.safeParse(input).data?.line.length ??
		TypeTerminalInputSchema.safeParse(input).data?.keys.length ??
		0
	);
}
