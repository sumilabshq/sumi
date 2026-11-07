import { refusalOf } from "./answer";
import type { Answer, Refusal } from "./answer";
import type { Authenticate } from "./authenticate";
import { isCovering } from "./guard";
import type { User } from "./guard";
import type { Invalidation } from "./invalidation";
import { refuseCaller } from "./local-routes";
import type { Route } from "./local-routes";
import type { Mediator, OutsideCaller } from "./mediator";
import type { AnyRequest } from "./request";
import { stepNameOf } from "./middleware";
import { throwIfRefused } from "./throw-if-refused";
import type { ChangeBroadcast } from "./transport";
import type { Answering, ServedCall } from "./transport";

export interface ExposeOptions {
	readonly adapter: string;
	readonly authenticate?: Authenticate | undefined;
}

export type AdapterOptions = Pick<ExposeOptions, "authenticate">;

export interface Exposed extends Answering {
	readonly requests: readonly AnyRequest[];
}

export interface ExposedRuntime {
	readonly routes: ReadonlyMap<string, Route>;
	readonly mediator: Mediator;
	announce(invalidated: readonly Invalidation[] | undefined): void;
	readonly changed: ChangeBroadcast;
	stoppedRefusal(name: string): Refusal | null;
}

const NOT_HERE = "{name} runs on no module of this runtime";
const UNGUARDED =
	"{request} is exposed with no guard deciding who calls it: guard its module or handler with AuthenticatedGuard, HasPermissionGuard or a guard that needs a user, PublicGuard when anyone may call it";
const NEEDS_AUTHENTICATE =
	"{request} is guarded by {guard}, which needs a user, and {adapter} has no Authenticate: pass one";

export function createExposure(runtime: ExposedRuntime, options: ExposeOptions): Exposed {
	const reachable = [...runtime.routes.values()].filter(isReachableOutside);
	throwIfRefused(
		options.adapter,
		reachable.flatMap((route) => guardFindings(route, options)),
	);
	const authenticate = options.authenticate ?? null;
	return {
		requests: reachable.map(({ handler }) => handler.request),
		answer: (call) => answerOutside(runtime, authenticate, call),
		changes: (hear) => runtime.changed.hear(hear),
	};
}

class HeadersCaller implements OutsideCaller {
	private known: Promise<User | null> | null = null;

	constructor(
		private readonly authenticate: Authenticate | null,
		private readonly headers: Headers,
	) {}

	user(): Promise<User | null> {
		this.known ??= this.authenticate === null ? Promise.resolve(null) : this.authenticate.userOf(this.headers);
		return this.known;
	}
}

async function answerOutside(
	runtime: ExposedRuntime,
	authenticate: Authenticate | null,
	{ name, input, idempotencyKey, signal, headers }: ServedCall,
): Promise<Answer<unknown>> {
	const route = runtime.routes.get(name);

	if (route === undefined) {
		return refusalOf("not-found", NOT_HERE.replace("{name}", name));
	}

	const stopped = runtime.stoppedRefusal(name);

	if (stopped !== null) {
		return stopped;
	}

	const outsideCaller = new HeadersCaller(authenticate, headers ?? new Headers());
	const keyed = idempotencyKey === null ? {} : { idempotencyKey };
	const answered = await runtime.mediator.send(route.handler.request, input, {
		signal,
		headers,
		outsideCaller,
		...keyed,
	});
	runtime.announce(answered.ok ? answered.invalidated : undefined);
	return answered;
}

function isReachableOutside(route: Route): boolean {
	return refuseCaller(route, undefined) === null;
}

function guardFindings({ handler: { request }, steps }: Route, { adapter, authenticate }: ExposeOptions): string[] {
	if (!steps.some(isCovering)) {
		return [UNGUARDED.replace("{request}", request.name)];
	}

	const needing = authenticate === undefined ? steps.find((step) => step.needsUser) : undefined;

	if (needing === undefined) {
		return [];
	}

	return [
		NEEDS_AUTHENTICATE.replace("{request}", request.name)
			.replace("{guard}", stepNameOf(steps, needing))
			.replace("{adapter}", adapter),
	];
}
