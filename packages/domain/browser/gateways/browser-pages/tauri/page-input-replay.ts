import { isPagePressedEvent } from "./pages-bridge.js";
import type { PageHoveredEvent, PagePressedEvent } from "./pages-bridge.js";

export class PageInputReplay {
	constructor(private readonly containerOf: (page: string) => HTMLElement | null) {}

	replay(event: PagePressedEvent | PageHoveredEvent): void {
		if (isPagePressedEvent(event)) {
			this.press(event.page);
			return;
		}

		this.hover(event);
	}

	private press(page: string): void {
		const container = this.containerOf(page);

		if (container === null) {
			console.info(`[widgetarium] press in browser page ${page} skipped: the page stands in no card`);
			return;
		}

		const realm = this.realmOf(container);
		container.dispatchEvent(new realm.Event("pointerdown", { bubbles: true, composed: true }));
	}

	private hover({ page, x, y }: PageHoveredEvent): void {
		const container = this.containerOf(page);
		const under = container?.ownerDocument.elementFromPoint(x, y) ?? null;

		if (container === null || under === null) {
			return;
		}

		under.dispatchEvent(this.pointerMoveIn(container, x, y));
	}

	private pointerMoveIn(container: HTMLElement, x: number, y: number): PointerEvent {
		const realm = this.realmOf(container);
		return new realm.PointerEvent("pointermove", {
			clientX: x,
			clientY: y,
			bubbles: true,
			composed: true,
		});
	}

	private realmOf(container: HTMLElement): Window & typeof globalThis {
		return container.ownerDocument.defaultView ?? window;
	}
}
