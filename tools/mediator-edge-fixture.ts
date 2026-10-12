import { z } from "zod";
import { ReportFailure, command, handlerOf, module, provided, query } from "../packages/core/src/mediator/index.ts";
import type { Failure, InputOf, Middleware, RequestContext } from "../packages/core/src/mediator/index.ts";

export const edge = {
	written: 0,
	twice: 0,
	keys: new Array<string | null>(),
	flakyRefusals: 1,
	sameNext: false,
	reports: new Array<Failure>(),
};

export const WriteThenThrow = command("edge/write-then-throw")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(({ id }) => id);
export const ThrowBeforeHandler = command("edge/throw-before-handler").idempotencyKey("none");
export const KeyBroken = command("edge/key-broken")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(() => {
		throw new Error("the key function broke");
	});
export const TransformBroken = query("edge/transform-broken")
	.input(
		z.object({ id: z.string() }).transform(() => {
			throw new Error("the transform broke");
		}),
	)
	.output(z.string());
export const NextTwice = command("edge/next-twice").idempotencyKey("none");
export const Mutated = command("edge/mutated")
	.input(z.object({ title: z.string() }))
	.idempotencyKey("none");
export const Flaky = command("edge/flaky")
	.input(z.object({ text: z.string() }))
	.idempotencyKey("per-call");

export class WriteThenThrowHandler extends handlerOf(WriteThenThrow) {
	override async handle(): Promise<void> {
		edge.written += 1;
		throw new Error("failed after the write");
	}
}

export class ThrowBeforeHandlerHandler extends handlerOf(ThrowBeforeHandler) {
	override async handle(): Promise<void> {
		edge.written += 1;
	}
}

export class KeyBrokenHandler extends handlerOf(KeyBroken) {
	override async handle(): Promise<void> {}
}

export class TransformBrokenHandler extends handlerOf(TransformBroken) {
	override async handle(): Promise<string> {
		return "never";
	}
}

export class NextTwiceHandler extends handlerOf(NextTwice) {
	override async handle(): Promise<void> {
		edge.twice += 1;
	}
}

export class MutatedHandler extends handlerOf(Mutated) {
	override async handle({ title }: InputOf<typeof Mutated>): Promise<void> {
		edge.keys.push(title);
	}
}

export class FlakyHandler extends handlerOf(Flaky) {
	override async handle(_input: InputOf<typeof Flaky>, ctx: RequestContext): Promise<void> {
		edge.keys.push(ctx.idempotencyKey);
	}
}

const misbehaving: Middleware = async (call, next) => {
	if (call.request === ThrowBeforeHandler) throw new Error("refused before the handler");
	if (call.request === Mutated) Reflect.set(Object(call.input), "title", "rewritten");
	if (call.request === Flaky && edge.flakyRefusals > 0) {
		edge.flakyRefusals -= 1;
		edge.keys.push(call.ctx.idempotencyKey);
		throw new Error("flaky before the handler");
	}
	if (call.request !== NextTwice) return next();
	const first = next();
	const second = next();
	edge.sameNext = first === second;
	await Promise.all([first, second]);
	return first;
};

export const edgeModule = module({
	name: "edge",
	requests: [WriteThenThrow, ThrowBeforeHandler, KeyBroken, TransformBroken, NextTwice, Mutated, Flaky],
	handlers: [
		WriteThenThrowHandler,
		ThrowBeforeHandlerHandler,
		KeyBrokenHandler,
		TransformBrokenHandler,
		NextTwiceHandler,
		MutatedHandler,
		FlakyHandler,
	],
	provide: [provided(ReportFailure, () => (failure: Failure) => edge.reports.push(failure))],
	use: [misbehaving],
});
