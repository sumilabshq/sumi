import { filledIconChoices } from "@widgetarium/kit/filled-icons";
import { fluentEmojiChoices } from "@widgetarium/kit/fluent-emojis";
import type { FlowIcon } from "@widgetarium/navigation/contract";

export type PickerTab = "icons" | "emoji";

export interface IconChoice {
	readonly key: string;
	readonly label: string;
	readonly words: string;
	readonly icon: FlowIcon;
}

const WORD_GAP = /\s+/;

const everyChoiceByTab: { [tab in PickerTab]?: readonly IconChoice[] } = {};

export function iconChoicesOf(tab: PickerTab, typed: string): readonly IconChoice[] {
	const every = everyChoiceOf(tab);
	const asked = typed
		.trim()
		.toLowerCase()
		.split(WORD_GAP)
		.filter((word) => word !== "");
	if (asked.length === 0) {
		return every;
	}

	return every.filter((choice) => asked.every((word) => choice.words.includes(word)));
}

export function isPickedChoice(choice: IconChoice, picked: FlowIcon | null): boolean {
	if (picked === null) {
		return false;
	}

	return picked.kind === "icon" ? picked.name === choice.key : picked.emoji === choice.key;
}

function everyChoiceOf(tab: PickerTab): readonly IconChoice[] {
	everyChoiceByTab[tab] ??= tab === "icons" ? iconsOffered() : emojiOffered();
	return everyChoiceByTab[tab];
}

function iconsOffered(): readonly IconChoice[] {
	return filledIconChoices().map(({ name, words }) => ({
		key: name,
		label: name.replaceAll("-", " "),
		words: words.toLowerCase(),
		icon: {
			kind: "icon",
			name,
		},
	}));
}

function emojiOffered(): readonly IconChoice[] {
	return fluentEmojiChoices().map(({ glyph, name, words }) => ({
		key: glyph,
		label: name,
		words,
		icon: {
			kind: "emoji",
			emoji: glyph,
		},
	}));
}
