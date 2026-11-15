import { typedLanguageOf } from "./typed-language.js";
import type { TypedLanguage } from "./typed-language.js";

export interface LanguageSwitch {
	readonly from: TypedLanguage;
	readonly to: TypedLanguage;
}

export type LanguageSwitchTracker = (typedText: string) => LanguageSwitch | null;

export function createLanguageSwitchTracker(preferredLocales: readonly Intl.Locale[]): LanguageSwitchTracker {
	const learnedLanguageByScript = new Map<string, string>();
	let current: TypedLanguage | null = null;
	return (typedText) => {
		const typed = typedLanguageOf(typedText, preferredLocales, learnedLanguageByScript);

		if (typed === null || (current !== null && identityOf(current) === identityOf(typed))) {
			return null;
		}

		learnLanguage(learnedLanguageByScript, typed);
		const previous = current;
		current = typed;
		return previous === null ? null : { from: previous, to: typed };
	};
}

function learnLanguage(learnedLanguageByScript: Map<string, string>, typed: TypedLanguage): void {
	if (typed.language === null) {
		return;
	}

	learnedLanguageByScript.set(typed.script, typed.language);
}

function identityOf(typed: TypedLanguage): string {
	return typed.language ?? typed.script;
}
