import { PerCall, Repeatable, command, guard, middleware, query, refuse, subscriber } from "@widgetarium/core/requests";
import type { User } from "@widgetarium/core/requests";
import { TerminalOutputChangedEvent } from "../../gateways/terminal-sessions/terminal-sessions.events.js";
import { TerminalSessionsGateway } from "../../gateways/terminal-sessions/terminal-sessions.gateway.js";
import {
	SendTerminalInputSchema,
	TerminalOutputSchema,
	TerminalSizeSchema,
	TypeTerminalInputSchema,
} from "../../shared/schema/terminal.schema.js";

const CALLED = "[terminal] app {app} → {request} ({chars} chars)";
const NO_APP = "only an app has a terminal: the call carries no app";

// TODO: per-app grants (which commands may run); every app may type anything today
export const TerminalAccessGuard = guard()
	.needsUser()
	.handle(() => undefined);

export const TerminalCallLoggerMiddleware = middleware().handle(({ request, input, context }, _injected, next) => {
	console.info(
		CALLED.replace("{app}", context.user?.id ?? "none")
			.replace("{request}", request)
			.replace("{chars}", String(charsOf(input))),
	);
	return next();
});

export const TerminalOutputQuery = query("terminal-output")
	.output(TerminalOutputSchema)
	.inject({ sessions: TerminalSessionsGateway })
	.handle((_input, { sessions, user }) => sessions.outputOf(appOf(user)));

export const StartTerminalCommand = command("start-terminal")
	.input(TerminalSizeSchema)
	.idempotencyKey(Repeatable)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async (size, { sessions, user, invalidate }) => {
		await sessions.start(appOf(user), size);
		invalidate(TerminalOutputQuery);
	});

export const ResizeTerminalCommand = command("resize-terminal")
	.input(TerminalSizeSchema)
	.idempotencyKey(Repeatable)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async (size, { sessions, user }) => {
		await sessions.resize(appOf(user), size);
	});

export const TypeTerminalCommand = command("type-terminal")
	.input(TypeTerminalInputSchema)
	.idempotencyKey(PerCall)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async ({ keys }, { sessions, user }) => {
		await sessions.type(appOf(user), keys);
	});

export const SendTerminalCommand = command("send-terminal")
	.input(SendTerminalInputSchema)
	.idempotencyKey(PerCall)
	.inject({ sessions: TerminalSessionsGateway })
	.handle(async ({ line }, { sessions, user, invalidate }) => {
		await sessions.send(appOf(user), line);
		invalidate(TerminalOutputQuery);
	});

export const RereadTerminalOutputSubscriber = subscriber(TerminalOutputChangedEvent).handle(
	(_input, { invalidate }) => {
		invalidate(TerminalOutputQuery);
	},
);

function appOf(user: User | null): string {
	if (user === null) {
		return refuse(NO_APP);
	}

	return user.id;
}

function charsOf(input: unknown): number {
	return (
		SendTerminalInputSchema.safeParse(input).data?.line.length ??
		TypeTerminalInputSchema.safeParse(input).data?.keys.length ??
		0
	);
}
