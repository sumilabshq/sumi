import { permission } from "@widgetarium/data-framework";
import type { Permission, User } from "@widgetarium/data-framework";

export type Sandbox =
	| { readonly kind: "full" }
	| { readonly kind: "read-only" }
	| { readonly kind: "project"; readonly roots: readonly string[] };

const SANDBOX_HEADER = "sumi-sandbox";
const WRITABLE_HEADER = "sumi-writable";
const SANDBOX_GRANT = "sandbox:";
const WRITE_GRANT = "write:";
const READ_ONLY = "read-only";
const PROJECT = "project";
export const TEMP_FOLDER = "/private/tmp";
export const USER_TEMP_PATTERN = "^/private/var/folders/[^/]+/[^/]+/T/";
const MAC_LINKED_ROOTS: readonly string[] = ["/tmp", "/var", "/etc"];
const READ_ONLY_REFUSAL =
	"The sandbox is read only: {path} was not changed. Ask the person to widen the sandbox under the composer.";
const OUTSIDE_REFUSAL =
	"The sandbox lets this chat change files only inside {roots}: {path} was not changed. Ask the person to widen the sandbox under the composer.";

export function sandboxGrantsOf(headers: Headers): Permission[] {
	const sandbox = headers.get(SANDBOX_HEADER);

	if (sandbox !== READ_ONLY && sandbox !== PROJECT) {
		return [];
	}

	const roots = sandbox === PROJECT ? writableRootsOf(headers.get(WRITABLE_HEADER)) : [];
	return [permission(`${SANDBOX_GRANT}${sandbox}`), ...roots.map((root) => permission(`${WRITE_GRANT}${root}`))];
}

export function sandboxOf({ permissions }: User): Sandbox {
	if (permissions.includes(permission(`${SANDBOX_GRANT}${READ_ONLY}`))) {
		return { kind: "read-only" };
	}

	if (!permissions.includes(permission(`${SANDBOX_GRANT}${PROJECT}`))) {
		return { kind: "full" };
	}

	const roots = permissions.flatMap((granted) =>
		granted.startsWith(WRITE_GRANT) ? [granted.slice(WRITE_GRANT.length)] : [],
	);
	return { kind: "project", roots };
}

// TRADE-OFF: lexical paths; a symlink inside a root can point outside it, Seatbelt still guards commands
export function writeRefusalOf(sandbox: Sandbox, path: string): string | null {
	if (sandbox.kind === "full") {
		return null;
	}

	if (sandbox.kind === "read-only") {
		return READ_ONLY_REFUSAL.replace("{path}", path);
	}

	const real = realPathOf(path);
	const roots = [...sandbox.roots, TEMP_FOLDER];

	if (roots.some((root) => real.startsWith(`${root}/`)) || new RegExp(USER_TEMP_PATTERN).test(real)) {
		return null;
	}

	return OUTSIDE_REFUSAL.replace("{roots}", sandbox.roots.join(", ")).replace("{path}", path);
}

function realPathOf(path: string): string {
	const parts: string[] = [];

	for (const part of path.split("/")) {
		if (part === "" || part === ".") {
			continue;
		}

		if (part === "..") {
			parts.pop();
			continue;
		}

		parts.push(part);
	}

	const normal = `/${parts.join("/")}`;
	const linked = MAC_LINKED_ROOTS.find((root) => normal === root || normal.startsWith(`${root}/`));
	return linked === undefined ? normal : `/private${normal}`;
}

function writableRootsOf(encoded: string | null): string[] {
	if (encoded === null) {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
		return Array.isArray(parsed)
			? parsed.filter((root): root is string => typeof root === "string" && root.startsWith("/")).map(realPathOf)
			: [];
	} catch (failure: unknown) {
		console.warn("[agent-tools] sandbox writable folders unreadable → none writable", failure);
		return [];
	}
}
