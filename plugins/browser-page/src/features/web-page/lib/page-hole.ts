import type { PageArea } from "@widgetarium/web-page";

const NO_ANCHOR = "no app frame or view holds tab {tab}, so its web page has nowhere to stand";

const PAGE_ANCHOR_TAB = "data-page-anchor-tab";

export class PageHole {
	readonly element = document.createElement("div");
	private readonly resized = new ResizeObserver(() => this.lay());

	private constructor(
		private readonly anchor: HTMLElement,
		private placed: PageArea,
	) {
		this.resized.observe(anchor);
		window.addEventListener("resize", this.lay);
		window.addEventListener("scroll", this.lay, {
			capture: true,
			passive: true,
		});
		this.lay();
		document.body.append(this.element);
	}

	static overAnchor(tab: string, area: PageArea): PageHole {
		const anchor = document.querySelector(`[${PAGE_ANCHOR_TAB}="${CSS.escape(tab)}"]`);

		if (!(anchor instanceof HTMLElement)) {
			throw new Error(NO_ANCHOR.replace("{tab}", tab));
		}

		return new PageHole(anchor, area);
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
		const box = this.anchor.getBoundingClientRect();

		if (!this.anchor.isConnected || box.width === 0 || box.height === 0) {
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
