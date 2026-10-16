import { refusalOf } from "./answer";
import type { Refusal } from "./answer";
import type { Inject, Injected } from "./handler";
import { stepOf } from "./middleware";
import type { Added, NothingAdded, Step, StepCall, StepNext, Typed } from "./middleware";
import type { Permission } from "./permission";

export interface User {
	readonly id: string;
	readonly permissions: readonly Permission[];
}

type DeniedCode = "unauthenticated" | "forbidden";

export interface Guard<In = unknown, A extends Added = Added, D extends Inject = Inject, U extends boolean = boolean>
	extends Step, Typed<In, A, D> {
	readonly kind: "guard";
	readonly inject: D;
	readonly needsUser: U;
}

export type UserGuard<In = unknown, A extends Added = Added> = Guard<In, A, Inject, true>;

export type InputGuard<In = unknown, A extends Added = Added> = Guard<In, A, Inject, false>;

export interface OpenGuard extends Step {
	readonly kind: "public";
}

export type Signed = { readonly user: User };

type Checked<A extends Added> = A | void | Promise<A | void>;

type Check<In, A extends Added, D extends Inject> = (call: StepCall<In>, injected: Injected<D>) => Checked<A>;

type AnyCheck = { bivariant(call: StepCall, injected: Injected<Inject>): Checked<Added> }["bivariant"];

interface Labelled<U extends boolean> {
	readonly label: string | null;
	readonly needsUser: U;
}

type Outcome = { readonly added: Added } | { readonly refusal: Refusal };

const NOTHING_INJECTED: NothingAdded = Object.freeze({});
const NOTHING_ADDED: NothingAdded = Object.freeze({});
const UNLABELLED: Labelled<false> = { label: null, needsUser: false };
const NEEDS_USER = "{request} needs a signed-in user";
const NEEDS_PERMISSION = "{request} needs the permission {permission}";

export class GuardBuilder<In, D extends Inject, U extends boolean = false> {
	constructor(
		private readonly tokens: D,
		private readonly labelled: Labelled<U>,
	) {}

	inject<const N extends Inject>(inject: N): GuardBuilder<In, N, U> {
		return new GuardBuilder(inject, this.labelled);
	}

	needsUser(): GuardBuilder<In, D, true> {
		return new GuardBuilder(this.tokens, { ...this.labelled, needsUser: true });
	}

	handle<A extends Added = NothingAdded>(check: Check<In, A, D>): Guard<In, A, D, U> {
		const checking: AnyCheck = check;
		const { needsUser } = this.labelled;
		const handled = async (call: StepCall, injected: Injected<Inject>, next: StepNext) => {
			const outcome = await outcomeOf(() => {
				if (needsUser) signedIn(call.request, call.context.user);
				return checking(call, injected);
			});
			return "refusal" in outcome ? outcome.refusal : next(outcome.added);
		};
		const shape = { kind: "guard", inject: this.tokens, ...this.labelled } as const;
		return { ...stepOf(shape, handled), kind: "guard", inject: this.tokens, needsUser };
	}
}

export function guard<In = unknown>(): GuardBuilder<In, NothingAdded> {
	return new GuardBuilder(NOTHING_INJECTED, UNLABELLED);
}

export function deny(reason: string): never {
	throw new GuardDenied("forbidden", reason);
}

export const PublicGuard: OpenGuard = {
	...stepOf({ kind: "public", inject: NOTHING_INJECTED, label: "PublicGuard" }, (_call, _injected, next) => next()),
	kind: "public",
};

export const AuthenticatedGuard: Guard<unknown, Signed, NothingAdded, true> = new GuardBuilder<
	unknown,
	NothingAdded,
	true
>(NOTHING_INJECTED, { label: "AuthenticatedGuard", needsUser: true }).handle(({ request, context }) => ({
	user: signedIn(request, context.user),
}));

export function HasPermissionGuard(wanted: Permission): Guard<unknown, Signed, NothingAdded, true> {
	return new GuardBuilder<unknown, NothingAdded, true>(NOTHING_INJECTED, {
		label: `HasPermissionGuard(${wanted})`,
		needsUser: true,
	}).handle(({ request, context }) => {
		const user = signedIn(request, context.user);
		if (user.permissions.includes(wanted)) return { user };
		return deny(NEEDS_PERMISSION.replace("{request}", request).replace("{permission}", wanted));
	});
}

export function isCovering(step: Step): boolean {
	return step.kind === "public" || step.needsUser;
}

async function outcomeOf(check: () => Checked<Added>): Promise<Outcome> {
	try {
		return { added: (await check()) ?? NOTHING_ADDED };
	} catch (thrown) {
		if (!(thrown instanceof GuardDenied)) throw thrown;
		return { refusal: refusalOf(thrown.code, thrown.message) };
	}
}

function signedIn(request: string, user: User | null): User {
	if (user !== null) return user;
	throw new GuardDenied("unauthenticated", NEEDS_USER.replace("{request}", request));
}

class GuardDenied extends Error {
	constructor(
		readonly code: DeniedCode,
		reason: string,
	) {
		super(reason);
	}
}
