export const KEBAB_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const PASCAL_NAME = /^[A-Z][A-Za-z0-9]*$/;

export const QUERY_SUFFIX = "Query";

export const COMMAND_SUFFIX = "Command";

export const FRAMEWORK = "@widgetarium/data-framework";

const WORD_START = /(?:^|-)([a-z0-9])/g;
const UPPER_LETTER = /[A-Z]/g;

export function pascalOf(kebab: string): string {
	return kebab.replace(WORD_START, (_match, letter: string) => letter.toUpperCase());
}

export function camelOf(kebab: string): string {
	const pascal = pascalOf(kebab);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function kebabOf(pascal: string): string {
	return pascal.replace(UPPER_LETTER, (letter, at: number) => `${at === 0 ? "" : "-"}${letter.toLowerCase()}`);
}

export function jsSpecifierOf(file: string): string {
	return file.replace(/\.ts$/, ".js");
}

export function withSuffix(name: string, suffix: string): string {
	return name.endsWith(suffix) && name !== suffix ? name : `${name}${suffix}`;
}
