export const SEGMENT_NAME = /^[a-z]+(-[a-z]+)*$/;

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
