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
		window.addEventListener("scroll", this.lay, {
			capture: true,
			passive: true,
		});
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
		window.removeEventListener("scroll", this.lay, {
			capture: true,
		});
		this.element.remove();
	}

	private readonly lay = (): void => {
		const box = this.frame.getBoundingClientRect();

		if (!this.frame.isConnected || box.width === 0 || box.height === 0) {
			this.element.style.display = "none";
			return;
		}

		Object.assign(this.element.style, holeStyleOf(box, this.placed));
	};
}

function holeStyleOf(box: DOMRect, placed: PageArea): Partial<CSSStyleDeclaration> {
	const left = Math.min(placed.x, box.width);
	const top = Math.min(placed.y, box.height);
	return {
		display: "block",
		position: "fixed",
		pointerEvents: "none",
		left: `${box.left + left}px`,
		top: `${box.top + top}px`,
		width: `${Math.min(placed.width, box.width - left)}px`,
		height: `${Math.min(placed.height, box.height - top)}px`,
	};
}
