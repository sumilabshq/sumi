import {
	PICTURE_ATTRIBUTE,
	PICTURE_GROUP_ATTRIBUTE,
	PICTURE_NAME_ATTRIBUTE,
	PICTURE_SIZE_ATTRIBUTE,
} from "@sumi/chat-plugin";
import type { ShownPicture } from "./shown-picture.js";

export interface PressedPictures {
	readonly pictures: readonly ShownPicture[];
	readonly startAt: number;
	readonly host: HTMLElement;
}

const PICTURE_SELECTOR = `[${PICTURE_ATTRIBUTE}]`;
const GROUP_SELECTOR = `[${PICTURE_GROUP_ATTRIBUTE}]`;
const TAB_ROOT = ".wg-shell-plate";
const CHAT_ROOT = ".wg-studio-ai";

export function pressedPicturesOf(target: EventTarget | null): PressedPictures | null {
	const pressed = target instanceof Element ? target.closest<HTMLElement>(PICTURE_SELECTOR) : null;
	const host = pressed?.closest<HTMLElement>(TAB_ROOT) ?? pressed?.closest<HTMLElement>(CHAT_ROOT) ?? null;

	if (!pressed || !host) {
		return null;
	}

	const group = pressed.closest<HTMLElement>(GROUP_SELECTOR);
	const marked = group === null ? [pressed] : [...group.querySelectorAll<HTMLElement>(PICTURE_SELECTOR)];
	return {
		pictures: marked.map(shownPictureOf),
		startAt: Math.max(0, marked.indexOf(pressed)),
		host,
	};
}

function shownPictureOf(element: HTMLElement): ShownPicture {
	return {
		src: element.getAttribute(PICTURE_ATTRIBUTE) ?? "",
		name: element.getAttribute(PICTURE_NAME_ATTRIBUTE) ?? "",
		size: element.getAttribute(PICTURE_SIZE_ATTRIBUTE),
	};
}
