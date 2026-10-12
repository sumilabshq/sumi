import { z } from "zod";
import { command, module, query, useCommand, useQuery } from "../packages/core/src/mediator/index.ts";
import type { App, Handles } from "../packages/core/src/mediator/index.ts";
import { AddPage, GetPages, GetPlatform } from "./mediator-fixture.ts";

const NoKey = command("canvas/no-key").input(z.object({ title: z.string() }));
const NoOutput = query("canvas/no-output").input(z.object({ title: z.string() }));

// @ts-expect-error a command without idempotencyKey is not a request a handler can handle
export type HandlesNoKey = Handles<typeof NoKey>;

export function sendsNoKey(app: App): unknown {
	// @ts-expect-error a command without idempotencyKey cannot be sent
	return app.send(NoKey, { title: "x" });
}

export function drawsNoKey(): unknown {
	// @ts-expect-error a command without idempotencyKey cannot be used in a view
	return useCommand(NoKey);
}

export function readsNoOutput(): unknown {
	// @ts-expect-error a query without output cannot be read
	return useQuery(NoOutput, { title: "x" });
}

export function sendsWrongInput(app: App): unknown {
	// @ts-expect-error the input is the request's input schema
	return app.send(GetPages, { prefix: 1 });
}

export class WrongReturnHandler implements Handles<typeof GetPlatform> {
	static readonly request = GetPlatform;
	// @ts-expect-error a handler returns its request's output
	async handle(): Promise<number> {
		return 1;
	}
}

class NoKeyHandler {
	static readonly request = NoKey;
	async handle(): Promise<void> {}
}

export const moduleWithNoKey = module({
	name: "canvas",
	requests: [],
	// @ts-expect-error a module refuses a handler of a command without idempotencyKey
	handlers: [NoKeyHandler],
});

class MismatchedHandler implements Handles<typeof GetPlatform> {
	static readonly request = AddPage;
	async handle(): Promise<string> {
		return "web";
	}
}

export const moduleWithMismatch = module({
	name: "canvas",
	requests: [],
	// @ts-expect-error a handler's static request must be the request it implements
	handlers: [MismatchedHandler],
});

export async function typedAnswer(app: App): Promise<readonly string[]> {
	const answer = await app.send(GetPages, { prefix: "" });
	return answer.ok ? answer.output : [];
}
