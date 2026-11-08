const SEGMENT = /^[a-z]+(-[a-z]+)*$/;
const ALIAS = /^[a-z]+(-[a-z]+)*-[1-9][0-9]*$/;
const BAD_ALIAS = '"{name}" is not an alias: a plugin id and a numeric suffix, such as "chat-2"';
const BAD_NAME =
	'"{name}" is not a name: one kebab-case segment of a-z, such as "command-menu", no digits, capitals, "." or "/"';

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
