import type { PageArea } from "@widgetarium/web-page";

const NO_FRAME = "no app frame holds tab {tab}, so its web page has nowhere to stand";

export class PageHole {
	readonly element = document.createElement("div");
	private readonly resized = new ResizeObserver(() => this.lay());

	private constructor(
		private readonly frame: HTMLIFrameElement,
		private placed: PageArea,
	) {
		this.resized.observe(frame);
		window.addEventListener("resize", this.lay);
		this.lay();
		document.body.append(this.element);
	}

	static overFrame(tab: string, area: PageArea): PageHole {
		const frame = document.querySelector(`iframe[data-app-frame-tab="${CSS.escape(tab)}"]`);

		if (!(frame instanceof HTMLIFrameElement)) {
			throw new Error(NO_FRAME.replace("{tab}", tab));
		}

		return new PageHole(frame, area);
	}

	get area(): PageArea {
		return this.placed;
	}

	moveTo(area: PageArea): void {
		this.placed = area;
		this.lay();
	}

	remove(): void {
		this.resized.disconnect();
		window.removeEventListener("resize", this.lay);
		this.element.remove();
	}

	private readonly lay = (): void => {
		const box = this.frame.getBoundingClientRect();
		Object.assign(this.element.style, {
			position: "fixed",
			pointerEvents: "none",
			left: `${box.left + this.placed.x}px`,
			top: `${box.top + this.placed.y}px`,
			width: `${this.placed.width}px`,
			height: `${this.placed.height}px`,
		});
	};
}
