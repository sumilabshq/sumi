export interface TypedLanguage {
	readonly language: string | null;
	readonly script: string;
	readonly label: string;
}

const DETECTABLE_SCRIPTS = [
	"Latn",
	"Cyrl",
	"Grek",
	"Armn",
	"Geor",
	"Hebr",
	"Arab",
	"Thai",
	"Deva",
	"Hang",
	"Hira",
	"Kana",
	"Hani",
] as const;

type Script = (typeof DETECTABLE_SCRIPTS)[number];

interface ScriptedLetter {
	readonly letter: string;
	readonly script: Script;
}

const LANGUAGE_OF_LETTER: Readonly<Partial<Record<string, string>>> = {
	і: "uk",
	ї: "uk",
	є: "uk",
	ґ: "uk",
	ы: "ru",
	э: "ru",
	ъ: "ru",
	ё: "ru",
	ў: "be",
};
const LANGUAGE_OF_SCRIPT: Readonly<Partial<Record<Script, string>>> = {
	Latn: "en",
	Grek: "el",
	Armn: "hy",
	Geor: "ka",
	Hebr: "he",
	Thai: "th",
	Hang: "ko",
	Hira: "ja",
	Kana: "ja",
};

export function typedLanguageOf(
	text: string,
	preferredLocales: readonly Intl.Locale[],
	learnedLanguageByScript: ReadonlyMap<string, string>,
): TypedLanguage | null {
	const scripted = lastScriptedLetterOf(text);

	if (scripted === null) {
		return null;
	}

	const language = languageOf(scripted, preferredLocales, learnedLanguageByScript);
	return {
		language,
		script: scripted.script,
		label: labelOf(language, scripted.script, preferredLocales),
	};
}

export function localesOf(tags: readonly string[]): Intl.Locale[] {
	return tags.flatMap((tag) => {
		try {
			return [new Intl.Locale(tag).maximize()];
		} catch {
			return [];
		}
	});
}

const TITLE_CASED_SCRIPTS: ReadonlySet<string> = new Set<Script>(["Latn", "Cyrl", "Grek", "Armn"]);
const SCRIPT_MATCHERS = DETECTABLE_SCRIPTS.map((script) => ({
	script,
	matcher: new RegExp(`^\\p{Script=${script}}$`, "u"),
}));

function languageOf(
	{ letter, script }: ScriptedLetter,
	preferredLocales: readonly Intl.Locale[],
	learnedLanguageByScript: ReadonlyMap<string, string>,
): string | null {
	return (
		LANGUAGE_OF_LETTER[letter.toLowerCase()] ??
		learnedLanguageByScript.get(script) ??
		preferredLocales.find((locale) => locale.script === script)?.language ??
		LANGUAGE_OF_SCRIPT[script] ??
		null
	);
}

function lastScriptedLetterOf(text: string): ScriptedLetter | null {
	for (const letter of Array.from(text).reverse()) {
		const script = scriptOf(letter);

		if (script !== null) {
			return {
				letter,
				script,
			};
		}
	}

	return null;
}

function scriptOf(letter: string): Script | null {
	return SCRIPT_MATCHERS.find(({ matcher }) => matcher.test(letter))?.script ?? null;
}

function labelOf(language: string | null, script: string, preferredLocales: readonly Intl.Locale[]): string {
	if (language === null) {
		return scriptNameOf(script, preferredLocales);
	}

	return nativeNameOf(language, script);
}

function nativeNameOf(language: string, script: string): string {
	const name = new Intl.DisplayNames([language], { type: "language", fallback: "code" }).of(language) ?? language;

	if (!TITLE_CASED_SCRIPTS.has(script)) {
		return name;
	}

	return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}

function scriptNameOf(script: string, preferredLocales: readonly Intl.Locale[]): string {
	const readerLocales = [...preferredLocales.map((locale) => locale.baseName), "en"];
	return new Intl.DisplayNames(readerLocales, { type: "script", fallback: "code" }).of(script) ?? script;
}
