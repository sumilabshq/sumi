import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface Shortcut {
	readonly key: string;
	readonly onPress: () => void;
}

export function useShortcut(frame: RefObject<HTMLElement | null>, { key, onPress }: Shortcut): void {
	const latest = useRef(onPress);
	latest.current = onPress;
	useEffect(() => {
		const onKey = (event: KeyboardEvent): void => {
			const held = frame.current;

			if (held === null || event.key.toLowerCase() !== key || !isWithTheCommandKey(event) || event.altKey) {
				return;
			}

			if (!answersFor(held, event)) {
				return;
			}

			event.preventDefault();
			event.stopImmediatePropagation();
			latest.current();
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [frame, key]);
}

function answersFor(frame: HTMLElement, event: KeyboardEvent): boolean {
	if (getComputedStyle(frame).visibility !== "visible") {
		return false;
	}

	if (event.target instanceof Node && frame.contains(event.target)) {
		return true;
	}

	const focused = frame.ownerDocument.activeElement;

	if (focused !== null && focused !== frame.ownerDocument.body) {
		return false;
	}

	// TRADE-OFF: names Obsidian's leaf class; a host-handed "is this view active" port would be cleaner
	const leaf = frame.closest(".workspace-leaf");
	return leaf === null || leaf.classList.contains("mod-active");
}

function isWithTheCommandKey(event: KeyboardEvent): boolean {
	return event.metaKey || event.ctrlKey;
}
