const SCROLL_END_PIN = "--sumi-composer-expand-scroll-end";
const SCROLL_HELD = "data-scroll-held";

export function holdChatScroll(frame: HTMLElement): void {
	if (frame.hasAttribute(SCROLL_HELD)) {
		return;
	}

	const scroll = frame.querySelector(".wg-studio-ai-scroll");

	if (scroll === null) {
		return;
	}

	frame.style.setProperty(SCROLL_END_PIN, getComputedStyle(scroll).paddingBottom);
	frame.setAttribute(SCROLL_HELD, "");
}

export function releaseChatScroll(frame: HTMLElement): void {
	frame.removeAttribute(SCROLL_HELD);
	frame.style.removeProperty(SCROLL_END_PIN);
}
