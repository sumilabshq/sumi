import { stableKey } from "../gateway/stable-key";
import { reasonOf, refusalOf, refusalOfThrown } from "./answer";
import type { Answer, Refusal } from "./answer";
import type { DoneKeys } from "./done-keys";
import type { User } from "./guard";
import { NEVER_ABORTED } from "./handler";
import type { AnyHandler, CallFacts } from "./handler";
import type { Asked, Settle } from "./mediator";
import type { Added, Step, StepCall, StepContext } from "./middleware";
import type { Provided } from "./module";
import { callerKeyOf, isKeyReplayed, keyRead } from "./policies";
import type { Callers } from "./policies";
import type { AnyRequest } from "./request";
import { Refused } from "./refused";
import type { Authenticate } from "./server/authenticate";

export interface Route {
	readonly handler: AnyHandler;
	readonly provided: Provided;
	readonly steps: readonly Step[];
}

interface LocalParts {
	readonly routes: ReadonlyMap<string, Route>;
	readonly authenticate: Authenticate | null;
	readonly doneKeys: DoneKeys;
	readonly callers: Callers;
}

interface Walk {
	readonly route: Route;
	readonly asked: Asked;
	readonly settle: Settle;
}

interface Keyed {
	readonly input: unknown;
	readonly user: User | null;
	readonly key: string | null;
}

const NO_HEADERS = new Headers();
const CALL_FACT_KEYS: readonly (keyof CallFacts)[] = ["user", "idempotencyKey", "signal"];
const ANSWERED_FOR_HANDLER = "{step} of {request} answered without next(): a step may only refuse";
const REPLACED_FACT = "{step} of {request} replaced {fact}, which only the server sets";
const STEP_AT = "step #{at}";
const UNDECLARED_SEND = "{request} sends {sent}, which it does not declare in .sends()";
const SENT_FAILED = "{sent} answered {code}: {reason}";

export class LocalRoutes {
	constructor(private readonly parts: LocalParts) {}

	routeOf(request: AnyRequest): Route | undefined {
		return this.parts.routes.get(request.name);
	}

	async run(route: Route, asked: Asked, settle: Settle): Promise<Answer<unknown>> {
		const { authenticate } = this.parts;
		const user = authenticate === null ? null : await authenticate.userOf(asked.sending.headers ?? NO_HEADERS);
		const call: StepCall = { request: asked.request.name, input: asked.input, context: { user } };
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
		if (key !== null && isKeyReplayed(request, user, this.parts.callers))
			return this.once(callerKeyOf(request.name, user, key), run);
		if (key !== null || request.kind !== "query") return run();
		return walk.settle.shared(callerKeyOf(request.name, user, stableKey(input)), run);
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
			const send = sendOf(walk, facts.signal, key);
			const returned = await route.handler.handle(input, { ...route.provided, ...facts, send });
			return settle.held(asked.request, returned, ran);
		} catch (thrown) {
			return settle.refuse(asked.request, refusalOfThrown(thrown, ran), thrown);
		}
	}
}

function sendOf({ route, asked, settle }: Walk, signal: AbortSignal, key: string | null) {
	return async (sent: AnyRequest, input?: unknown): Promise<unknown> => {
		if (!route.handler.sends.some(({ name }) => name === sent.name)) {
			throw new Error(UNDECLARED_SEND.replace("{request}", asked.request.name).replace("{sent}", sent.name));
		}

		const idempotencyKey = key === null ? undefined : `${key}:${sent.name}`;
		const answer = await settle.send(sent, input, { headers: asked.sending.headers, signal, idempotencyKey });

		if (answer.ok) {
			return answer.output;
		}

		const reason = SENT_FAILED.replace("{sent}", sent.name)
			.replace("{code}", answer.code)
			.replace("{reason}", answer.reason);
		throw answer.ran ? new Error(reason) : new Refused(reason);
	};
}

function replacedFactOf(context: StepContext, added: Added): string | null {
	const kept: Added = { user: context.user };
	return CALL_FACT_KEYS.find((fact) => fact in added && added[fact] !== kept[fact]) ?? null;
}

function ranIn(request: AnyRequest, passedOn: readonly Answer<unknown>[]): boolean {
	return passedOn.some((answer) => (answer.ok ? request.kind === "command" : answer.ran));
}
