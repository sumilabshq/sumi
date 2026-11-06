import { bundledLanguages, bundledLanguagesAlias } from "shiki/langs";
import type { BundledLanguage } from "shiki/langs";
import type { LanguageInput } from "shiki/core";

export type CodeLanguage = BundledLanguage;

const EXTRA_ALIASES: Readonly<Record<string, CodeLanguage>> = {
	zsh: "bash",
	console: "bash",
};

export function languageOf(label: string): CodeLanguage | null {
	const name = label.toLowerCase();

	if (isCodeLanguage(name)) {
		return name;
	}

	return aliasOf(name);
}

export function loaderOf(language: CodeLanguage): LanguageInput {
	return bundledLanguages[language];
}

function aliasOf(name: string): CodeLanguage | null {
	if (Object.hasOwn(EXTRA_ALIASES, name)) {
		return EXTRA_ALIASES[name] ?? null;
	}

	const aliased: unknown = Object.hasOwn(bundledLanguagesAlias, name) ? Reflect.get(bundledLanguagesAlias, name) : null;
	return typeof aliased === "string" && isCodeLanguage(aliased) ? aliased : null;
}

function isCodeLanguage(name: string): name is CodeLanguage {
	return Object.hasOwn(bundledLanguages, name);
}
