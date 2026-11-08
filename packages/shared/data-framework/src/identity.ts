// TRADE-OFF: named by the generated list, since JavaScript cannot read a variable's name.
export interface Identity {
	path: string | null;
	module: string | null;
}

export interface Identified {
	readonly identity: Identity;
}

const SEGMENT = /^[a-z]+(-[a-z]+)*$/;
const NAME = /^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)*$/;
const BAD_NAME =
	'"{name}" is not a name: kebab-case segments of a-z joined by dots, such as "pages.by-id", no digits, capitals, "/" or "_"';
const BAD_MODULE = '"{name}" is not a module name: one kebab-case segment of a-z, such as "chat-tabs"';
const PREFIX = /^[a-z]+(-[a-z]+)*(-[1-9][0-9]*)?$/;
const BAD_PREFIX =
	'"{name}" is not a prefix: prefix is reserved for the name every route of a module starts with, one kebab-case segment such as "chat" or "chat-2"; a module config field cannot be named prefix';
const UNNAMED =
	"{kind} has no name yet: its name comes from the variable it is exported as, written in by the generator; run npm run generate";
const NAMED_TWICE = '{kind} is already named "{was}", and is named "{now}" again: name each building block once';

export function unnamedIdentity(): Identity {
	return {
		path: null,
		module: null,
	};
}

export function fullNameOf({ path, module }: Identity, kind: string): string {
	if (path === null) {
		throw new Error(UNNAMED.replace("{kind}", kind));
	}

	return module === null ? path : `${module}.${path}`;
}

export function labelOf(identity: Identity, kind: string): string {
	return identity.path === null ? kind : fullNameOf(identity, kind);
}

export function nameIdentity(identity: Identity, path: string, kind: string): void {
	const name = checkedName(path);

	if (identity.path !== null && identity.path !== name) {
		throw new Error(NAMED_TWICE.replace("{kind}", kind).replace("{was}", identity.path).replace("{now}", name));
	}

	identity.path = name;
}

export function placeIdentity(identity: Identity, module: string, kind: string): void {
	const name = checkedModuleName(module);

	if (identity.module !== null && identity.module !== name) {
		const said = NAMED_TWICE.replace("{kind}", kind).replace("{was}", `${identity.module}.`);
		throw new Error(said.replace("{now}", `${name}.`));
	}

	identity.module = name;
}

export function checkedModuleName(name: string): string {
	if (!SEGMENT.test(name)) {
		throw new Error(BAD_MODULE.replace("{name}", name));
	}

	return name;
}

export function checkedPrefix(prefix: unknown): string {
	if (typeof prefix !== "string" || !PREFIX.test(prefix)) {
		throw new Error(BAD_PREFIX.replace("{name}", String(prefix)));
	}

	return prefix;
}

export function wireNameOf(prefix: string | null, name: string): string {
	return prefix === null ? name : `${prefix}.${name}`;
}

function checkedName(name: string): string {
	if (!NAME.test(name)) {
		throw new Error(BAD_NAME.replace("{name}", name));
	}

	return name;
}
