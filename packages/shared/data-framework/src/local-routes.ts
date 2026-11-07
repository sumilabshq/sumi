import { stableKey } from "./gateway/stable-key";
import { reasonOf, refusalOf, refusalOfThrown } from "./answer";
import type { Answer, Refusal } from "./answer";
import type { DoneKeys } from "./done-keys";
import { emitOf } from "./event-bus";
import { invalidateInto } from "./invalidation";
import type { Invalidation } from "./invalidation";
import type { EventBus } from "./event-bus";
import type { AnyEvent } from "./event";
import type { User } from "./guard";
import { NEVER_ABORTED } from "./handler";
import type { AnyHandler, CallFacts } from "./handler";
import type { Asked, InProcessCaller, Settle } from "./mediator";
import type { Added, Step, StepCall, StepContext } from "./middleware";
import type { Provided } from "./module";
import { callerKeyOf, isKeyReplayed, keyRead } from "./policies";
import type { CallerOrigin } from "./policies";
import type { AnyRequest } from "./request";
import { outputOfSent, stampSent } from "./send";
import type { CallingModule } from "./calling-module";

export interface Route {
	readonly handler: AnyHandler;
	readonly provided: Provided;
	readonly steps: readonly Step[];
}

interface LocalParts {
	readonly routes: ReadonlyMap<string, Route>;
	readonly doneKeys: DoneKeys;
	readonly bus: EventBus;
}

interface Walk {
	readonly route: Route;
	readonly asked: Asked;
	readonly settle: Settle;
}

type CallerRead = { readonly user: User | null } | { readonly thrown: unknown };

interface Keyed {
	readonly input: unknown;
	readonly user: User | null;
	readonly key: string | null;
}

const CALL_FACT_KEYS: readonly (keyof CallFacts)[] = ["user", "idempotencyKey", "signal"];
const ANSWERED_FOR_HANDLER = "{step} of {request} answered without next(): a step may only refuse";
const REPLACED_FACT = "{step} of {request} replaced {fact}, which only the server sets";
const STEP_AT = "step #{at}";
const REACHED_IN_PROCESS_ONLY = "{request} is reached only from inside its own process";
const CALLABLE_BY_MODULES = "{request} is callable only by module(s) {modules}, not by {caller}";
const VIEW = "a view";
const UNKNOWN_CALLER = "{request}: the caller could not be authenticated";

export function refuseCaller({ handler: { request } }: Route, caller: InProcessCaller | undefined): Refusal | null {
	const { visibility } = request;

	if (caller === undefined) {
		return visibility.reach === "public"
			? null
			: refusalOf("not-found", REACHED_IN_PROCESS_ONLY.replace("{request}", request.name));
	}

	if (visibility.reach !== "modules" || isListedCaller(request, visibility.modules, caller)) {
		return null;
	}

	const said = CALLABLE_BY_MODULES.replace("{request}", request.name).replace("{modules}", visibility.modules.join(", "));
	return refusalOf("forbidden", said.replace("{caller}", caller.module ?? VIEW));
}

export class LocalRoutes {
	constructor(private readonly parts: LocalParts) {}

	routeOf(request: AnyRequest): Route | undefined {
		return this.parts.routes.get(request.name);
	}

	async run(route: Route, asked: Asked, settle: Settle): Promise<Answer<unknown>> {
		const caller = await callerUserOf(asked);

		if ("thrown" in caller) {
			const reason = UNKNOWN_CALLER.replace("{request}", asked.request.name);
			return settle.refuse(asked.request, refusalOf("unauthenticated", reason), caller.thrown);
		}

		const call: StepCall = { request: asked.request.name, input: asked.input, context: { user: caller.user } };
		return this.throughSteps({ route, asked, settle }, call, 0);
	}

	private async throughSteps(walk: Walk, call: StepCall, at: number): Promise<Answer<unknown>> {
		const step = walk.route.steps[at];
		if (step === undefined) return this.runKeyed(walk, call);
		const { next, passedOn } = this.recordedNext(walk, call, at);
		try {
			const answer = await step.handle(call, walk.route.provided, next);
			return passedOn.includes(answer) ? answer : this.stepAnswer(walk, at, answer, passedOn);
		} catch (thrown) {
			return this.thrownAfter(walk, passedOn, thrown);
		}
	}

	private recordedNext(walk: Walk, call: StepCall, at: number) {
		const passedOn: Answer<unknown>[] = [];
		const next = async (added?: Added): Promise<Answer<unknown>> => {
			const answered = await this.passedOn(walk, call, at, added);
			passedOn.push(answered);
			return answered;
		};
		return { next, passedOn };
	}

	private thrownAfter(walk: Walk, passedOn: readonly Answer<unknown>[], thrown: unknown): Refusal {
		const { request } = walk.asked;
		return walk.settle.refuse(request, refusalOf("failed", reasonOf(thrown), ranIn(request, passedOn)), thrown);
	}

	private passedOn(walk: Walk, call: StepCall, at: number, added: Added | undefined): Promise<Answer<unknown>> {
		if (added === undefined) return this.throughSteps(walk, call, at + 1);
		const replaced = replacedFactOf(call.context, added);
		if (replaced === null) return this.throughSteps(walk, { ...call, context: { ...call.context, ...added } }, at + 1);
		const reason = this.said(REPLACED_FACT, walk, at).replace("{fact}", replaced);
		return Promise.resolve(walk.settle.refuse(walk.asked.request, refusalOf("failed", reason)));
	}

	private stepAnswer(walk: Walk, at: number, answer: Answer<unknown>, passedOn: readonly Answer<unknown>[]): Refusal {
		const { request } = walk.asked;
		const ran = ranIn(request, passedOn);
		if (!answer.ok) return walk.settle.refuse(request, refusalOf(answer.code, answer.reason, answer.ran || ran));
		return walk.settle.refuse(request, refusalOf("failed", this.said(ANSWERED_FOR_HANDLER, walk, at), ran));
	}

	private said(message: string, walk: Walk, at: number): string {
		const step = walk.route.steps[at];
		const named = step?.label ?? STEP_AT.replace("{at}", String(at + 1));
		return message.replace("{step}", named).replace("{request}", walk.asked.request.name);
	}

	private runKeyed(walk: Walk, { input, context }: StepCall): Promise<Answer<unknown>> {
		const { request, givenKey, sending } = walk.asked;
		const read = keyRead(request, input, givenKey);
		if ("refusal" in read) return Promise.resolve(walk.settle.refuse(request, read.refusal));
		const signal = sending.signal ?? NEVER_ABORTED;
		const run = () => this.runHandler(walk, input, { ...context, idempotencyKey: read.key, signal }, read.key);
		const minted = sending.idempotencyKey === undefined ? givenKey : undefined;
		const keyed = { input, user: context.user, key: read.key === minted ? null : read.key };
		return this.runDeduped(walk, keyed, run);
	}

	private runDeduped(walk: Walk, { input, user, key }: Keyed, run: () => Promise<Answer<unknown>>) {
		const { request } = walk.asked;
		const origin = callerOriginOf(walk.asked);

		if (key !== null && isKeyReplayed(request, user, origin)) {
			return this.once(callerKeyOf(request.name, origin, user, key), run);
		}

		if (key !== null || request.kind !== "query") return run();
		return walk.settle.shared(callerKeyOf(request.name, origin, user, stableKey(input)), run);
	}

	private async once(doneKey: string, run: () => Promise<Answer<unknown>>): Promise<Answer<unknown>> {
		const { doneKeys } = this.parts;
		const claim = await doneKeys.claim(doneKey);
		if (!claim.isFirst) return claim.answer;
		const answer = await run();
		if (answer.ok || answer.ran) await doneKeys.settle(doneKey, answer);
		else await doneKeys.release(doneKey, answer);
		return answer;
	}

	private async runHandler(
		walk: Walk,
		input: unknown,
		facts: CallFacts & Added,
		key: string | null,
	): Promise<Answer<unknown>> {
		const { route, asked, settle } = walk;
		const ran = asked.request.kind === "command";
		try {
			const invalidated: Invalidation[] = [];
			const calling = callingModuleOf(route, asked);
			const send = sendOf(walk, { signal: facts.signal, key, invalidated, calling });
			const emitted: [AnyEvent, unknown][] = [];
			const emitting = {
				owner: asked.request.name,
				module: route.handler.request.module ?? "",
			};
			const emit = emitOf(this.parts.bus, emitting, (event, emittedInput) => emitted.push([event, emittedInput]));
			const invalidate = ran ? invalidateInto(invalidated, calling) : undefined;
			const returned = await route.handler.handle(input, { ...route.provided, ...facts, send, emit, invalidate });
			const answer = settle.held(asked.request, returned, ran, invalidated.length === 0 ? undefined : invalidated);

			for (const [event, emittedInput] of emitted) {
				this.parts.bus.publish(event, emittedInput);
			}

			return answer;
		} catch (thrown) {
			return settle.refuse(asked.request, refusalOfThrown(thrown, ran), thrown);
		}
	}
}

interface SendState {
	readonly signal: AbortSignal;
	readonly key: string | null;
	readonly invalidated: Invalidation[];
	readonly calling: CallingModule;
}

function sendOf({ asked, settle }: Walk, { signal, key, invalidated, calling }: SendState) {
	return async (sent: AnyRequest, input?: unknown): Promise<unknown> => {
		const stamped = stampSent(sent, calling);
		const idempotencyKey = key === null ? undefined : `${key}:${stamped.name}`;
		const answer = await settle.send(stamped, input, {
			headers: asked.sending.headers,
			outsideCaller: asked.sending.outsideCaller,
			signal,
			idempotencyKey,
			inProcessCaller: { module: calling.module },
		});

		if (answer.ok) {
			invalidated.push(...(answer.invalidated ?? []));
		}

		return outputOfSent(stamped, answer);
	};
}

function callingModuleOf({ handler }: Route, asked: Asked): CallingModule {
	return {
		module: handler.request.module ?? "",
		importedModuleNames: handler.module.importedModuleNames,
		owner: asked.request.name,
	};
}

function callerOriginOf({ sending }: Asked): CallerOrigin {
	return sending.outsideCaller === undefined ? "in-process" : "outside";
}

async function callerUserOf({ sending }: Asked): Promise<CallerRead> {
	try {
		return { user: (await sending.outsideCaller?.user()) ?? null };
	} catch (thrown) {
		return { thrown };
	}
}

function isListedCaller(request: AnyRequest, modules: readonly string[], { module }: InProcessCaller): boolean {
	return module !== null && (module === request.module || modules.includes(module));
}

function replacedFactOf(context: StepContext, added: Added): string | null {
	const kept: Added = { user: context.user };
	return CALL_FACT_KEYS.find((fact) => fact in added && added[fact] !== kept[fact]) ?? null;
}

function ranIn(request: AnyRequest, passedOn: readonly Answer<unknown>[]): boolean {
	return passedOn.some((answer) => (answer.ok ? request.kind === "command" : answer.ran));
}
