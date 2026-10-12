import { z } from "zod";
import {
	command,
	handlerOf,
	module,
	provided,
	query,
	useCommand,
	useQuery,
} from "../packages/core/src/mediator/index.ts";
import type { App, InputOf } from "../packages/core/src/mediator/index.ts";
import { GetPages, GetPlatform, Pages } from "./mediator-fixture.ts";

const NoKey = command("canvas/no-key").input(z.object({ title: z.string() }));
const NoOutput = query("canvas/no-output").input(z.object({ title: z.string() }));
const SameShape = query("canvas/same-shape").output(z.string());

// @ts-expect-error a command without idempotencyKey is not a request a handler can handle
export const HandlerOfNoKey = handlerOf(NoKey);

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

export class WrongReturnHandler extends handlerOf(GetPlatform) {
	// @ts-expect-error a handler returns its request's output
	override async handle(): Promise<number> {
		return 1;
	}
}

export class WrongInputHandler extends handlerOf(GetPages) {
	// @ts-expect-error a handler takes its request's input
	override async handle({ prefix }: { prefix: number }): Promise<string[]> {
		return [String(prefix)];
	}
}

class HandWrittenHandler {
	static readonly request = SameShape;
	async handle(): Promise<string> {
		return "web";
	}
}

export const moduleWithHandWritten = module({
	name: "canvas",
	requests: [],
	// @ts-expect-error a module takes only handlers made by handlerOf
	handlers: [HandWrittenHandler],
});

export class TypedInputHandler extends handlerOf(GetPages) {
	override async handle({ prefix }: InputOf<typeof GetPages>): Promise<string[]> {
		return [prefix];
	}
}

// @ts-expect-error a provided value is what its token promises
export const providesNumber = provided(Pages, () => 1);

// @ts-expect-error a provided value carries every member of its token
export const providesHalf = provided(Pages, () => ({ platform: "web", list: () => [] }));

export const providesPages = provided(Pages, (host) => ({
	platform: host.is("web") ? "web" : "other",
	list: () => [],
	add: () => 0,
}));

export async function typedAnswer(app: App): Promise<readonly string[]> {
	const answer = await app.send(GetPages, { prefix: "" });
	return answer.ok ? answer.output : [];
}
