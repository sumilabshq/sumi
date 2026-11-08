// TRADE-OFF: a slot is named by the generated plugin file, since JavaScript cannot read a variable's name.
export interface Identity {
	name: string | null;
	owner: string | null;
}

const SEGMENT = /^[a-z]+(-[a-z]+)*$/;
const ALIAS = /^[a-z]+(-[a-z]+)*-[1-9][0-9]*$/;
const BAD_ALIAS = '"{name}" is not an alias: a plugin id and a numeric suffix, such as "chat-2"';
const BAD_NAME =
	'"{name}" is not a name: one kebab-case segment of a-z, such as "command-menu", no digits, capitals, "." or "/"';
const UNNAMED =
	"{kind} has no name yet: its name comes from the variable it is exported as, written in by the generator; run npm run generate";
const NAMED_TWICE = '{kind} is already named "{was}", and is named "{now}" again: name each building block once';

export function unnamedIdentity(): Identity {
	return {
		name: null,
		owner: null,
	};
}

export function fullNameOf({ name, owner }: Identity, kind: string): string {
	if (name === null) {
		throw new Error(UNNAMED.replace("{kind}", kind));
	}

	return owner === null ? name : `${owner}.${name}`;
}

export function nameIdentity(identity: Identity, name: string, kind: string): void {
	identity.name = renamedTo(identity.name, checkedName(name), kind);
}

export function placeIdentity(identity: Identity, owner: string, kind: string): void {
	identity.owner = renamedTo(identity.owner, checkedName(owner), kind);
}

function renamedTo(was: string | null, now: string, kind: string): string {
	if (was !== null && was !== now) {
		throw new Error(NAMED_TWICE.replace("{kind}", kind).replace("{was}", was).replace("{now}", now));
	}

	return now;
}

export function checkedAlias(alias: string): string {
	if (!ALIAS.test(alias)) {
		throw new Error(BAD_ALIAS.replace("{name}", alias));
	}

	return alias;
}

export function checkedName(name: string): string {
	if (!SEGMENT.test(name)) {
		throw new Error(BAD_NAME.replace("{name}", name));
	}

	return name;
}
