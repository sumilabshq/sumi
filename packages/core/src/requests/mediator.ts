import { stableKey } from "../gateway/stable-key";
import { issuesOf, reasonOf, refusalOf, refusalOfThrown } from "./answer";
import type { Answer, Refusal } from "./answer";
import type { DoneKeys } from "./done-keys";
import type { Guard, User } from "./guard";
import type { AnyHandler, CallFacts } from "./handler";
import type { Provided } from "./module";
import { callerKeyOf, guardRefusal, keyRead, rateLimitRefusal } from "./policies";
import type { RateLimits } from "./rate-limits";
import type { FailureReport } from "./report-failure";
import type { AnyRequest } from "./request";
import type { Authenticate } from "./server/authenticate";

export interface Route {
	readonly handler: AnyHandler;
	readonly provided: Provided;
	readonly guards: readonly Guard[];
}

export interface Sending {
	readonly idempotencyKey?: string | undefined;
	readonly signal?: AbortSignal | undefined;
	readonly headers?: Headers | undefined;
}

export interface RemoteCall {
	readonly request: AnyRequest;
	readonly sent: unknown;
	readonly idempotencyKey: string | null;
	readonly signal: AbortSignal;
}

export type Remote = (call: RemoteCall) => Promise<Answer<unknown>>;

interface ServerPolicies {
	readonly rateLimits: RateLimits;
	readonly authenticate: Authenticate | null;
}

interface MediatorNeeds {
	readonly routes: ReadonlyMap<string, Route>;
	readonly remote: Remote | null;
	readonly policies: ServerPolicies | null;
	readonly doneKeys: DoneKeys;
	readonly reportFailure: FailureReport;
}

export interface SettledNow {
	readonly output: unknown;
}

type Passed = { readonly user: User | null } | { readonly refusal: Refusal };

const NEVER_ABORTED = new AbortController().signal;
const NO_HEADERS = new Headers();
const NO_FACTS: CallFacts = { idempotencyKey: null, signal: NEVER_ABORTED, user: null };
const NO_USER: Passed = { user: null };
const NO_SERVER = "{name} runs on no module of this app, and no server is configured";
const NOT_HERE = "{name} runs on no module of this server";

export const NOT_WATCHED = (): void => undefined;

export class Mediator {
	private readonly running = new Map<string, Promise<Answer<unknown>>>();

	constructor(private readonly needs: MediatorNeeds) {}

	async send(request: AnyRequest, sent: unknown, sending: Sending = {}): Promise<Answer<unknown>> {
		try {
			const input = request.inputSchema.safeParse(sent);
			if (!input.success)
				return this.refuse(request, refusalOf("invalid-input", issuesOf(request.name, "input", input.error)));
			const route = this.needs.routes.get(request.name);
			if (route !== undefined) return await this.runLocal(route, request, input.data, sending);
			return await this.runRemote(request, sent, input.data, sending);
		} catch (thrown) {
			return this.refuse(request, refusalOf("failed", reasonOf(thrown)), thrown);
		}
	}

	isLocal(request: AnyRequest): boolean {
		return this.needs.routes.has(request.name);
	}

	cannotRun(request: AnyRequest): string | null {
		if (this.isLocal(request) || this.needs.remote !== null) return null;
		return this.notHere(request).reason;
	}

	readNow(request: AnyRequest, sent: unknown): SettledNow | null {
		const route = this.needs.routes.get(request.name);
		if (route === undefined || request.kind !== "query" || !request.isSettledNow) return null;
		const input = request.inputSchema.safeParse(sent);
		if (!input.success) return null;
		try {
			return settledOf(request, route.handler.run(input.data, { ...route.provided, ...NO_FACTS }));
		} catch (thrown) {
			this.refuse(request, refusalOfThrown(thrown, false), thrown);
			return null;
		}
	}

	watch(request: AnyRequest, sent: unknown, changed: () => void): () => void {
		const route = this.needs.routes.get(request.name);
		const input = request.inputSchema.safeParse(sent);
		if (route?.handler.watch == null || !input.success) return NOT_WATCHED;
		return route.handler.watch(input.data, route.provided, changed);
	}

	private async runRemote(
		request: AnyRequest,
		sent: unknown,
		input: unknown,
		sending: Sending,
	): Promise<Answer<unknown>> {
		const { remote } = this.needs;
		if (remote === null) return this.refuse(request, this.notHere(request));
		const read = keyRead(request, input, this.givenKeyOf(sending));
		if ("refusal" in read) return this.refuse(request, read.refusal);
		const signal = sending.signal ?? NEVER_ABORTED;
		const call = () => this.remoteAnswer(remote, { request, sent, idempotencyKey: read.key, signal });
		if (request.kind !== "query") return call();
		return this.shared(`${request.name} ${stableKey(sent)}`, call);
	}

	private async remoteAnswer(remote: Remote, call: RemoteCall): Promise<Answer<unknown>> {
		const answer = await remote(call);
		return answer.ok ? this.held(call.request, answer.output) : this.refuse(call.request, answer);
	}

	private async runLocal(
		route: Route,
		request: AnyRequest,
		input: unknown,
		sending: Sending,
	): Promise<Answer<unknown>> {
		const passed = await this.passedPolicies(route, request, input, sending.headers);
		if ("refusal" in passed) return this.refuse(request, passed.refusal);
		const given = this.givenKeyOf(sending);
		const read = keyRead(request, input, given);
		if ("refusal" in read) return this.refuse(request, read.refusal);
		const { user } = passed;
		const run = () =>
			this.runHandler(route, request, input, {
				idempotencyKey: read.key,
				signal: sending.signal ?? NEVER_ABORTED,
				user,
			});
		const minted = sending.idempotencyKey === undefined ? given : undefined;
		if (read.key !== null && read.key !== minted) return this.once(callerKeyOf(request.name, user, read.key), run);
		if (request.kind !== "query") return run();
		return this.shared(callerKeyOf(request.name, user, stableKey(input)), run);
	}

	private async passedPolicies(
		route: Route,
		request: AnyRequest,
		input: unknown,
		headers: Headers | undefined,
	): Promise<Passed> {
		const { policies } = this.needs;
		if (policies === null) return NO_USER;
		const user = policies.authenticate === null ? null : await policies.authenticate.userOf(headers ?? NO_HEADERS);
		const guarded = await guardRefusal(route, { request: request.name, input, user });
		if (guarded !== null) return { refusal: guarded };
		const limited = await rateLimitRefusal(policies.rateLimits, request, user);
		return limited === null ? { user } : { refusal: limited };
	}

	private shared(key: string, run: () => Promise<Answer<unknown>>): Promise<Answer<unknown>> {
		const known = this.running.get(key);
		if (known !== undefined) return known;
		const answer = run().finally(() => this.running.delete(key));
		this.running.set(key, answer);
		return answer;
	}

	private async once(doneKey: string, run: () => Promise<Answer<unknown>>): Promise<Answer<unknown>> {
		const { doneKeys } = this.needs;
		const claim = await doneKeys.claim(doneKey);
		if (!claim.isFirst) return claim.answer;
		const answer = await run();
		if (answer.ok || answer.ran) await doneKeys.settle(doneKey, answer);
		else await doneKeys.release(doneKey, answer);
		return answer;
	}

	private async runHandler(
		route: Route,
		request: AnyRequest,
		input: unknown,
		facts: CallFacts,
	): Promise<Answer<unknown>> {
		const ran = request.kind === "command";
		try {
			const returned = await route.handler.run(input, { ...route.provided, ...facts });
			return this.held(request, returned, ran);
		} catch (thrown) {
			return this.refuse(request, refusalOfThrown(thrown, ran), thrown);
		}
	}

	private held(request: AnyRequest, returned: unknown, ran = false): Answer<unknown> {
		const output = request.outputSchema.safeParse(returned);
		if (output.success) return { ok: true, output: output.data };
		return this.refuse(request, refusalOf("invalid-output", issuesOf(request.name, "output", output.error), ran));
	}

	private givenKeyOf({ idempotencyKey }: Sending): string | undefined {
		if (idempotencyKey !== undefined || this.needs.policies !== null) return idempotencyKey;
		return crypto.randomUUID();
	}

	private notHere(request: AnyRequest): Refusal {
		if (this.needs.policies !== null) return refusalOf("not-found", NOT_HERE.replace("{name}", request.name));
		return refusalOf("no-server", NO_SERVER.replace("{name}", request.name));
	}

	private refuse(request: AnyRequest, refusal: Refusal, thrown: unknown = null): Refusal {
		this.needs.reportFailure({
			source: request.name,
			reason: refusal.reason,
			code: refusal.code,
			ran: refusal.ran,
			thrown,
		});
		return refusal;
	}
}

function settledOf(request: AnyRequest, returned: unknown): SettledNow | null {
	if (returned instanceof Promise) return null;
	const output = request.outputSchema.safeParse(returned);
	return output.success ? { output: output.data } : null;
}
