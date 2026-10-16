import type { Inject, Injected } from "./handler";
import type { Permission } from "./permission";

export interface User {
	readonly id: string;
	readonly permissions: readonly Permission[];
}

export interface GuardCall {
	readonly request: string;
	readonly input: unknown;
	readonly user: User | null;
}

export interface GuardRefusal {
	readonly code: "unauthenticated" | "forbidden" | "refused-by-guard";
	readonly reason: string;
}

type GuardVerdict = GuardRefusal | null;

interface GuardDefinition<D extends Inject> {
	readonly inject?: D;
	readonly needsUser?: boolean;
	check(call: GuardCall, injected: Injected<D>): GuardVerdict | Promise<GuardVerdict>;
}

export interface Guard<D extends Inject = Inject> {
	readonly isPublic: false;
	readonly inject: D;
	readonly needsUser: boolean;
	readonly label: string | null;
	check(call: GuardCall, injected: Injected<D>): GuardVerdict | Promise<GuardVerdict>;
}

export interface OpenGuard {
	readonly isPublic: true;
}

export type AnyGuard = Guard | OpenGuard;

const NOTHING_INJECTED = Object.freeze({});
const NEEDS_USER = "{request} needs a signed-in user";
const NEEDS_PERMISSION = "{request} needs the permission {permission}";

export const PublicGuard: OpenGuard = Object.freeze({ isPublic: true });

export function guard<const D extends Inject = Record<never, never>>(definition: GuardDefinition<D>): Guard<D>;
export function guard(definition: GuardDefinition<Inject>): Guard {
	return labelledGuard(definition, null);
}

export const AuthenticatedGuard: Guard = labelledGuard(
	{ needsUser: true, check: ({ request, user }) => (user === null ? unauthenticated(request) : null) },
	"AuthenticatedGuard",
);

export function HasPermissionGuard(wanted: Permission): Guard {
	const check = ({ request, user }: GuardCall): GuardVerdict => {
		if (user === null) return unauthenticated(request);
		if (user.permissions.includes(wanted)) return null;
		return {
			code: "forbidden",
			reason: NEEDS_PERMISSION.replace("{request}", request).replace("{permission}", wanted),
		};
	};
	return labelledGuard({ needsUser: true, check }, `HasPermissionGuard(${wanted})`);
}

export function isPublicGuard(given: AnyGuard): given is OpenGuard {
	return given.isPublic;
}

function labelledGuard(definition: GuardDefinition<Inject>, label: string | null): Guard {
	return Object.freeze({
		isPublic: false,
		inject: definition.inject ?? NOTHING_INJECTED,
		needsUser: definition.needsUser ?? false,
		label,
		check: (call: GuardCall, injected: Injected<Inject>) => definition.check(call, injected),
	});
}

function unauthenticated(request: string): GuardRefusal {
	return { code: "unauthenticated", reason: NEEDS_USER.replace("{request}", request) };
}
