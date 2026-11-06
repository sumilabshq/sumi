import type { LanguageInput } from "shiki/core";

export const LANGUAGE_LOADERS = {
	bash: () => import("shiki/langs/bash.mjs"),
	css: () => import("shiki/langs/css.mjs"),
	diff: () => import("shiki/langs/diff.mjs"),
	go: () => import("shiki/langs/go.mjs"),
	html: () => import("shiki/langs/html.mjs"),
	javascript: () => import("shiki/langs/javascript.mjs"),
	json: () => import("shiki/langs/json.mjs"),
	jsx: () => import("shiki/langs/jsx.mjs"),
	markdown: () => import("shiki/langs/markdown.mjs"),
	python: () => import("shiki/langs/python.mjs"),
	rust: () => import("shiki/langs/rust.mjs"),
	sql: () => import("shiki/langs/sql.mjs"),
	swift: () => import("shiki/langs/swift.mjs"),
	tsx: () => import("shiki/langs/tsx.mjs"),
	typescript: () => import("shiki/langs/typescript.mjs"),
	yaml: () => import("shiki/langs/yaml.mjs"),
} satisfies Readonly<Record<string, LanguageInput>>;

export type CodeLanguage = keyof typeof LANGUAGE_LOADERS;

const LANGUAGE_ALIASES: Readonly<Record<string, CodeLanguage>> = {
	ts: "typescript",
	js: "javascript",
	sh: "bash",
	zsh: "bash",
	shell: "bash",
	console: "bash",
	yml: "yaml",
	md: "markdown",
	py: "python",
	rs: "rust",
};

export function languageOf(label: string): CodeLanguage | null {
	const name = label.toLowerCase();
	const known = Object.hasOwn(LANGUAGE_ALIASES, name) ? LANGUAGE_ALIASES[name] : name;
	return known !== undefined && isCodeLanguage(known) ? known : null;
}

function isCodeLanguage(name: string): name is CodeLanguage {
	return Object.hasOwn(LANGUAGE_LOADERS, name);
}
