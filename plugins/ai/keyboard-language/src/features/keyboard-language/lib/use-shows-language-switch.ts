import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { caretAnchorOf } from "./caret-anchor.js";
import type { CaretAnchor } from "./caret-anchor.js";
import { createLanguageSwitchTracker } from "./language-switch.js";
import type { LanguageSwitchTracker } from "./language-switch.js";
import { localesOf } from "./typed-language.js";

export interface LanguageTag {
	readonly label: string;
	readonly anchor: CaretAnchor;
	readonly isShown: boolean;
}

type TagSetter = (tag: LanguageTag | null) => void;

interface TagShower {
	readonly show: (tag: LanguageTag) => void;
	readonly stop: () => void;
}

const TAG_VISIBLE_MS = 500;
const TAG_FADE_MS = 180;
const TYPED_INPUT_TYPES: ReadonlySet<string> = new Set(["insertText", "insertCompositionText"]);

export function useShowsLanguageSwitch(fieldRef: RefObject<HTMLTextAreaElement | null>): LanguageTag | null {
	const [tag, setTag] = useState<LanguageTag | null>(null);

	useEffect(() => {
		const field = fieldRef.current;

		if (field === null) {
			return undefined;
		}

		return listenForLanguageSwitch(field, setTag);
	}, [fieldRef]);

	return tag;
}

function listenForLanguageSwitch(field: HTMLTextAreaElement, setTag: TagSetter): () => void {
	const shower = createTagShower(setTag);
	const onInput = createInputListener(field, createLanguageSwitchTracker(localesOf(navigator.languages)), shower);
	field.addEventListener("input", onInput);
	return () => {
		shower.stop();
		field.removeEventListener("input", onInput);
	};
}

function createInputListener(
	field: HTMLTextAreaElement,
	switchOf: LanguageSwitchTracker,
	shower: TagShower,
): (event: Event) => void {
	return (event) => {
		const typedText = typedTextOf(event);
		const languageSwitch = typedText === null ? null : switchOf(typedText);

		if (languageSwitch === null) {
			return;
		}

		console.info(`[keyboard-language] ${languageSwitch.from.label} → ${languageSwitch.to.label}`);
		shower.show(shownTagOf(languageSwitch.to.label, caretAnchorOf(field)));
	};
}

function shownTagOf(label: string, anchor: CaretAnchor): LanguageTag {
	return {
		label,
		anchor,
		isShown: true,
	};
}

function createTagShower(setTag: TagSetter): TagShower {
	const timeoutIds: number[] = [];
	const stop = (): void => {
		timeoutIds.splice(0).forEach((timeoutId) => window.clearTimeout(timeoutId));
	};
	const show = (tag: LanguageTag): void => {
		stop();
		setTag(tag);
		timeoutIds.push(...hideTimeoutsOf(tag, setTag));
	};
	return {
		show,
		stop,
	};
}

function hideTimeoutsOf(tag: LanguageTag, setTag: TagSetter): number[] {
	return [
		window.setTimeout(() => setTag({ ...tag, isShown: false }), TAG_VISIBLE_MS),
		window.setTimeout(() => setTag(null), TAG_VISIBLE_MS + TAG_FADE_MS),
	];
}

function typedTextOf(event: Event): string | null {
	if (!(event instanceof InputEvent) || !TYPED_INPUT_TYPES.has(event.inputType)) {
		return null;
	}

	return event.data;
}
