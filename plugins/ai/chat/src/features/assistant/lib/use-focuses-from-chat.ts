import { useEffect } from "react";
import type { RefObject } from "react";
import { forget, isInteractive, markTypingBox, putLast, typingBox } from "./typing-box.js";
import type { Composer } from "./typing-box.js";

const CHAT_VIEW = ".wg-studio-ai";
const MAIN_BUTTON = 0;

export function useFocusesFromChat(composerBox: RefObject<HTMLTextAreaElement | null>): void {
	useEffect(() => {
		const box = composerBox.current;
		const view = box?.closest<HTMLElement>(CHAT_VIEW) ?? null;

		if (box === null || view === null) {
			return undefined;
		}

		const composer = {
			box,
			view,
		};
		putLast(composer);

		if (typingBox() === box) {
			focus(box);
		}

		const stopListening = listenFromChat(composer);
		return () => {
			stopListening();
			forget(composer);
		};
	}, [composerBox]);
}

function listenFromChat(composer: Composer): () => void {
	const { box, view } = composer;
	const stop = new AbortController();
	const heard = {
		signal: stop.signal,
	};
	let isPressedInView = false;
	box.addEventListener("focus", () => putLast(composer), heard);
	document.addEventListener("focusin", markTypingBox, heard);
	document.addEventListener("focusout", () => queueMicrotask(markTypingBox), heard);
	view.addEventListener("mousedown", (event) => keepFocusOnChromePress(event, box), heard);
	view.addEventListener(
		"pointerdown",
		(event) => {
			isPressedInView = event.button === MAIN_BUTTON;
		},
		heard,
	);
	document.addEventListener(
		"pointerup",
		(event) => {
			const isOwnRelease = isPressedInView && event.button === MAIN_BUTTON;
			isPressedInView = false;

			if (isOwnRelease && !isInteractive(event.target) && document.getSelection()?.isCollapsed !== false) {
				focus(box);
			}
		},
		heard,
	);
	document.addEventListener("keydown", (event) => takeTypedCharacter(event, box), heard);
	return () => stop.abort();
}

function keepFocusOnChromePress(event: MouseEvent, box: HTMLTextAreaElement): void {
	if (event.button !== MAIN_BUTTON || !isChromePress(event.target)) {
		return;
	}

	event.preventDefault();

	if (document.activeElement === box) {
		return;
	}

	document.getSelection()?.removeAllRanges();
	focus(box);
}

function takeTypedCharacter(event: KeyboardEvent, box: HTMLTextAreaElement): void {
	const isCharacter = event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
	const isTaken = event.defaultPrevented || event.isComposing;

	if (!isCharacter || isTaken || document.activeElement === box || typingBox() !== box) {
		return;
	}

	focus(box);
}

function focus(box: HTMLTextAreaElement): void {
	box.focus({
		preventScroll: true,
	});
}

function isChromePress(target: EventTarget | null): boolean {
	return target instanceof Element && !isInteractive(target) && !isSelectable(target);
}

function isSelectable(pressed: Element): boolean {
	for (let element: Element | null = pressed; element !== null; element = element.parentElement) {
		const look = getComputedStyle(element);
		const choice = look.userSelect || look.webkitUserSelect;

		if (choice !== "auto") {
			return choice !== "none";
		}
	}

	return true;
}
