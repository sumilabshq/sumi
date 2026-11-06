import { refusalOf } from "./answer";
import type { Refusal } from "./answer";
import type { Inject, Injected } from "./handler";
import { declareStep, stepOf } from "./middleware";
import type {
	Added,
	DeclaredStep,
	NothingAdded,
	StepCallWithOptions,
	StepOptions,
	Step,
	StepCall,
	StepNext,
	Typed,
} from "./middleware";
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

type Check<In, A extends Added, D extends Inject, O extends StepOptions> = (
	call: StepCallWithOptions<In, O>,
	injected: Injected<D>,
) => Checked<A>;

type AnyCheck = {
	bivariant(call: StepCallWithOptions<unknown, StepOptions>, injected: Injected<Inject>): Checked<Added>;
}["bivariant"];

interface Labelled<U extends boolean> {
	readonly label: string | null;
	readonly needsUser: U;
	readonly takesOptions: boolean;
}

type Outcome = { readonly added: Added } | { readonly refusal: Refusal };

const NOTHING_INJECTED: NothingAdded = Object.freeze({});
const NOTHING_ADDED: NothingAdded = Object.freeze({});
const UNLABELLED: Labelled<false> = { label: null, needsUser: false, takesOptions: false };
const NEEDS_USER = "{request} needs a signed-in user";
const NEEDS_PERMISSION = "{request} needs the permission {permission}";
const NAMES_NO_PERMISSION =
	"{request} is guarded by HasPermissionGuard used without permissions: call it as HasPermissionGuard(permission, …)";

export class GuardBuilder<In, D extends Inject, U extends boolean = false, O extends StepOptions = never> {
	constructor(
		private readonly tokens: D,
		private readonly labelled: Labelled<U>,
	) {}

	options<const N extends StepOptions>(): GuardBuilder<In, D, U, N> {
		return new GuardBuilder(this.tokens, { ...this.labelled, takesOptions: true });
	}

	inject<const N extends Inject>(inject: N): GuardBuilder<In, N, U, O> {
		return new GuardBuilder(inject, this.labelled);
	}

	needsUser(): GuardBuilder<In, D, true, O> {
		return new GuardBuilder(this.tokens, { ...this.labelled, needsUser: true });
	}

	handle<A extends Added = NothingAdded>(check: Check<In, A, D, O>): DeclaredStep<Guard<In, A, D, U>, O> {
		const checking: AnyCheck = check;
		const { tokens, labelled } = this;
		const { needsUser } = labelled;
		const guardOf = (options: StepOptions): Guard<In, A, D, U> => {
			const handled = async (call: StepCall, injected: Injected<Inject>, next: StepNext) => {
				const outcome = await outcomeOf(() => {
					if (needsUser) signedIn(call.request, call.context.user);
					return checking({ ...call, options }, injected);
				});
				return "refusal" in outcome ? outcome.refusal : next(outcome.added);
			};
			const shape = { kind: "guard", inject: tokens, label: labelled.label, needsUser } as const;
			return { ...stepOf(shape, handled), kind: "guard", inject: tokens, needsUser };
		};
		return declareStep(guardOf, labelled.takesOptions);
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
>(NOTHING_INJECTED, { label: "AuthenticatedGuard", needsUser: true, takesOptions: false }).handle(
	({ request, context }) => ({
		user: signedIn(request, context.user),
	}),
);

export const HasPermissionGuard = new GuardBuilder<unknown, NothingAdded, true>(NOTHING_INJECTED, {
	label: "HasPermissionGuard",
	needsUser: true,
	takesOptions: false,
})
	.options<[first: Permission, ...rest: Permission[]]>()
	.handle<Signed>(({ request, context, options }) => {
		const user = signedIn(request, context.user);

		if (options.length === 0) {
			return deny(NAMES_NO_PERMISSION.replace("{request}", request));
		}

		const missing = options.find((wanted) => !user.permissions.includes(wanted));

		if (missing === undefined) {
			return { user };
		}

		return deny(NEEDS_PERMISSION.replace("{request}", request).replace("{permission}", missing));
	});

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
