import { CallLoggerMiddleware, PerCall, Repeatable, guard } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { ownedKeyOf } from "../../shared/lib/owned-key.js";
import { outputChanged } from "../../gateways/terminal-sessions/terminal-sessions.events.js";
import {
	ResizeTerminalInputSchema,
	SendTerminalInputSchema,
	TerminalOutputSchema,
	TerminalSessionSchema,
	TypeTerminalInputSchema,
} from "../../shared/schema/terminal.schema.js";

const CHARS_SENT = "({chars} chars)";

// TODO: per-app grants (which commands may run); every app may type anything today
export const TerminalAccessGuard = guard()
	.needsUser()
	.handle(() => undefined);

export const TerminalCallLoggerMiddleware = CallLoggerMiddleware("terminal", (input) =>
	CHARS_SENT.replace("{chars}", String(charsOf(input))),
);

export const output = query()
	.public()
	.input(TerminalSessionSchema)
	.output(TerminalOutputSchema)
	.handle(({ session }, { sessions, user }) => sessions.outputOf(ownedKeyOf(user, session)));

export const resize = command()
	.public()
	.input(ResizeTerminalInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ session, cols, rows }, { sessions, user, invalidate }) => {
		const owned = ownedKeyOf(user, session);

		if (sessions.outputOf(owned).status === "not-started") {
			await sessions.start(owned, { cols, rows });
			invalidate(output);
			return;
		}

		await sessions.resize(owned, { cols, rows });
	});

export const typeText = command()
	.public()
	.input(TypeTerminalInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ session, keys }, { sessions, user }) => {
		await sessions.type(ownedKeyOf(user, session), keys);
	});

export const sendLine = command()
	.public()
	.input(SendTerminalInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ session, line }, { sessions, user, invalidate }) => {
		await sessions.send(ownedKeyOf(user, session), line);
		invalidate(output);
	});

export const rereadOutput = subscriber(outputChanged).handle((_input, { invalidate }) => {
	invalidate(output);
});

function charsOf(input: unknown): number {
	return (
		SendTerminalInputSchema.safeParse(input).data?.line.length ??
		TypeTerminalInputSchema.safeParse(input).data?.keys.length ??
		0
	);
}
