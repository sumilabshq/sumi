import { FILLED_ICONS } from "../../../shared/lib/filled-icons.js";
import type { WorkspaceIcon } from "../../../shared/schema/workspace.schema.js";

export type LookTab = "icon" | "emoji";

export interface LookChoice {
	readonly key: string;
	readonly words: string;
	readonly icon: WorkspaceIcon;
}

const EMOJI_WORDS: ReadonlyArray<readonly [string, string]> = [
	["🏠", "house home"],
	["💼", "briefcase work"],
	["🧩", "puzzle piece"],
	["📚", "books reading library"],
	["✈️", "airplane travel"],
	["🚀", "rocket launch"],
	["🎧", "headphones music"],
	["🌿", "herb plant garden"],
	["💸", "money finance"],
	["🔬", "microscope science lab"],
	["🎨", "palette art design"],
	["📝", "memo note writing"],
	["📊", "chart data"],
	["🛠️", "tools build"],
	["🎯", "target goal"],
	["💡", "bulb idea"],
	["🧠", "brain mind"],
	["🎓", "graduation study"],
	["🏆", "trophy win"],
	["🎁", "gift present"],
	["☕", "coffee"],
	["🍳", "cooking food"],
	["🏃", "running sport"],
	["🎮", "game controller"],
	["📷", "camera photo"],
	["🎵", "music note"],
	["🌍", "globe world"],
	["🏖️", "beach holiday"],
	["🐶", "dog pet"],
	["🔥", "fire hot"],
	["🌙", "moon night"],
	["☀️", "sun day"],
	["⭐", "star"],
	["❤️", "heart love"],
	["🙂", "smile face"],
];

export function lookChoicesOf(tab: LookTab, typed: string): readonly LookChoice[] {
	const choices = tab === "icon" ? ICON_CHOICES : EMOJI_CHOICES;
	const asked = typed.trim().toLowerCase();
	if (asked === "") {
		return choices;
	}

	return choices.filter((choice) => choice.words.includes(asked));
}

export function isChosen(choice: LookChoice, icon: WorkspaceIcon | null): boolean {
	return choice.key === keyOf(icon);
}

export function tabOf(icon: WorkspaceIcon | null): LookTab {
	return icon?.kind === "emoji" ? "emoji" : "icon";
}

function keyOf(icon: WorkspaceIcon | null): string | null {
	if (icon === null) {
		return null;
	}

	return icon.kind === "icon" ? icon.name : icon.emoji;
}

const ICON_CHOICES: readonly LookChoice[] = Object.keys(FILLED_ICONS).map((name) => ({
	key: name,
	words: name.replaceAll("-", " "),
	icon: { kind: "icon", name },
}));

const EMOJI_CHOICES: readonly LookChoice[] = EMOJI_WORDS.map(([emoji, words]) => ({
	key: emoji,
	words,
	icon: { kind: "emoji", emoji },
}));
