const SCROLL_END_PIN = "--sumi-composer-expand-scroll-end";

export function holdChatScroll(frame: HTMLElement): void {
	if (frame.dataset.scrollHeld !== undefined) {
		return;
	}

	const scroll = frame.querySelector(".wg-studio-ai-scroll");

	if (scroll === null) {
		return;
	}

	frame.style.setProperty(SCROLL_END_PIN, getComputedStyle(scroll).paddingBottom);
	frame.dataset.scrollHeld = "";
}

export function releaseChatScroll(frame: HTMLElement): void {
	delete frame.dataset.scrollHeld;
	frame.style.removeProperty(SCROLL_END_PIN);
}
