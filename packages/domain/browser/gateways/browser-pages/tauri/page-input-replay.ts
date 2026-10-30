export class PageInputReplay {
	constructor(private readonly containerOf: (page: string) => HTMLElement | null) {}

	press(page: string): void {
		const container = this.containerOf(page);

		if (container === null) {
			console.info(`[widgetarium] press in browser page ${page} skipped: the page stands in no card`);
			return;
		}

		const PageEvent = container.ownerDocument.defaultView?.Event ?? Event;
		container.dispatchEvent(new PageEvent("pointerdown", { bubbles: true, composed: true }));
	}

	hover(x: number, y: number): void {
		const under = document.elementFromPoint(x, y);

		if (under === null) {
			return;
		}

		under.dispatchEvent(
			new PointerEvent("pointermove", {
				clientX: x,
				clientY: y,
				bubbles: true,
			}),
		);
	}
}
