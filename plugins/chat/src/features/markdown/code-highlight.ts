import { createCssVariablesTheme, createHighlighterCore } from "shiki/core";
import type { HighlighterCore, ThemedToken } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { loaderOf } from "./code-languages.js";
import type { CodeLanguage } from "./code-languages.js";

const THEME_NAME = "sumi";
const THEME = createCssVariablesTheme({
	name: THEME_NAME,
	variablePrefix: "--sumi-code-",
});
const ITALIC = 1;
const BOLD = 2;
const KEPT_HIGHLIGHTS = 200;

const tokensByKey = new Map<string, ThemedToken[][]>();
let highlighter: Promise<HighlighterCore> | null = null;

export function highlightCode(code: HTMLElement, body: string, language: CodeLanguage): void {
	tokensOf(body, language).then(
		(lines) => {
			if (code.textContent !== body) {
				return;
			}

			code.replaceChildren(...createLineNodes(code.ownerDocument, lines));
		},
		(error: unknown) => {
			console.error(`[sumi-chat] ${language} code stayed plain, highlighting failed`, error);
		},
	);
}

async function tokensOf(body: string, language: CodeLanguage): Promise<ThemedToken[][]> {
	const key = `${language}\n${body}`;
	const kept = tokensByKey.get(key);

	if (kept) {
		return kept;
	}

	const ready = await highlighterFor(language);
	const lines = ready.codeToTokens(body, {
		lang: language,
		theme: THEME_NAME,
	}).tokens;
	keepTokens(key, lines);
	return lines;
}

async function highlighterFor(language: CodeLanguage): Promise<HighlighterCore> {
	const ready = await highlighterReady();

	if (!ready.getLoadedLanguages().includes(language)) {
		await ready.loadLanguage(loaderOf(language));
	}

	return ready;
}

function highlighterReady(): Promise<HighlighterCore> {
	highlighter ??= createHighlighterCore({
		themes: [THEME],
		langs: [],
		engine: createJavaScriptRegexEngine(),
	});
	return highlighter;
}

function keepTokens(key: string, lines: ThemedToken[][]): void {
	if (tokensByKey.size >= KEPT_HIGHLIGHTS) {
		const oldest = tokensByKey.keys().next();

		if (!oldest.done) {
			tokensByKey.delete(oldest.value);
		}
	}

	tokensByKey.set(key, lines);
}

function createLineNodes(page: Document, lines: readonly ThemedToken[][]): readonly Node[] {
	return lines.flatMap((line, at) => {
		const tokens = line.map((token) => createTokenNode(page, token));
		return at === lines.length - 1 ? tokens : [...tokens, page.createTextNode("\n")];
	});
}

function createTokenNode(page: Document, token: ThemedToken): Node {
	const span = page.createElement("span");
	span.textContent = token.content;

	if (token.color !== undefined) {
		span.style.color = token.color;
	}

	const style = token.fontStyle ?? 0;

	if ((style & ITALIC) !== 0) {
		span.style.fontStyle = "italic";
	}

	if ((style & BOLD) !== 0) {
		span.style.fontWeight = "600";
	}

	return span;
}
