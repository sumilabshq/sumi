const GHOST_STYLE: Partial<CSSStyleDeclaration> = {
	position: "fixed",
	left: "0",
	top: "0",
	zIndex: "2147483000",
	margin: "0",
	boxSizing: "border-box",
	pointerEvents: "none",
	willChange: "transform",
};

export class FollowingGhost {
	private frame = 0;

	constructor(
		private readonly element: HTMLElement,
		private grabOffset: readonly [number, number],
	) {
		element.setAttribute("aria-hidden", "true");
		Object.assign(element.style, GHOST_STYLE);
		document.body.append(element);
	}

	follow(x: number, y: number): void {
		cancelAnimationFrame(this.frame);
		this.frame = requestAnimationFrame(() => {
			this.element.style.transform = `translate3d(${x - this.grabOffset[0]}px, ${y - this.grabOffset[1]}px, 0)`;
		});
	}

	landAt(left: number, top: number): void {
		cancelAnimationFrame(this.frame);
		this.element.style.transform = `translate3d(${left}px, ${top}px, 0)`;
	}

	grabAt(grabOffset: readonly [number, number]): void {
		this.grabOffset = grabOffset;
	}

	remove(): void {
		cancelAnimationFrame(this.frame);
		this.element.remove();
	}
}
