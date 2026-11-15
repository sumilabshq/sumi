import assert from "node:assert/strict";
import { createLanguageSwitchTracker } from "../plugins/ai/keyboard-language/src/features/keyboard-language/lib/language-switch.ts";
import {
	localesOf,
	typedLanguageOf,
} from "../plugins/ai/keyboard-language/src/features/keyboard-language/lib/typed-language.ts";

const NOTHING_LEARNED = new Map<string, string>();
const LEARNED_UKRAINIAN = new Map([["Cyrl", "uk"]]);

const typedLanguageCases = [
	{
		typedText: "a",
		preferredTags: ["en-US"],
		learned: NOTHING_LEARNED,
		expectedLabel: "English",
	},
	{
		typedText: "ж",
		preferredTags: ["en-US", "uk-UA"],
		learned: NOTHING_LEARNED,
		expectedLabel: "Українська",
	},
	{
		typedText: "ж",
		preferredTags: ["en-US"],
		learned: NOTHING_LEARNED,
		expectedLabel: "Cyrillic",
	},
	{
		typedText: "ї",
		preferredTags: ["en-US"],
		learned: NOTHING_LEARNED,
		expectedLabel: "Українська",
	},
	{
		typedText: "ж",
		preferredTags: ["en-US"],
		learned: LEARNED_UKRAINIAN,
		expectedLabel: "Українська",
	},
	{
		typedText: "ы",
		preferredTags: ["en-US"],
		learned: LEARNED_UKRAINIAN,
		expectedLabel: "Русский",
	},
	{
		typedText: "ä",
		preferredTags: ["de-DE"],
		learned: NOTHING_LEARNED,
		expectedLabel: "Deutsch",
	},
	{
		typedText: "ა",
		preferredTags: ["en"],
		learned: NOTHING_LEARNED,
		expectedLabel: "ქართული",
	},
	{
		typedText: "ж1!",
		preferredTags: ["en", "not a tag!"],
		learned: LEARNED_UKRAINIAN,
		expectedLabel: "Українська",
	},
] as const;

for (const { typedText, preferredTags, learned, expectedLabel } of typedLanguageCases) {
	assert.equal(
		typedLanguageOf(typedText, localesOf(preferredTags), learned)?.label,
		expectedLabel,
		`${typedText} with ${preferredTags.join(",")}`,
	);
}

assert.equal(typedLanguageOf("5", localesOf(["en"]), NOTHING_LEARNED), null, "a digit names no language");
assert.equal(localesOf(["en", "not a tag!"]).length, 1, "a malformed preferred tag is dropped, never thrown");

const switchOf = createLanguageSwitchTracker(localesOf(["en-US", "uk-UA"]));
assert.equal(switchOf("a"), null, "the first letter only sets the language");
assert.equal(switchOf("b"), null, "the same language is no switch");
assert.equal(switchOf("ж")?.to.label, "Українська", "Latin to Cyrillic is a switch");
assert.equal(switchOf("ї"), null, "a second Ukrainian letter is no switch");
assert.equal(switchOf("c")?.from.label, "Українська", "the switch back names where it came from");

console.info(`keyboard-language: ${typedLanguageCases.length + 7} checks passed`);
