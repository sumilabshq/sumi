import type { SidebarDrag } from "./sidebar-drag.js";

export class DragFollow {
	constructor(private readonly drag: SidebarDrag) {}

	listen(): void {
		window.addEventListener("pointermove", this.onMove);
		window.addEventListener("pointerup", this.onUp);
		window.addEventListener("pointercancel", this.onCancel);
		window.addEventListener("keydown", this.onKey, true);
		window.addEventListener("blur", this.onBlur);
		window.addEventListener("selectstart", preventSelection, true);
	}

	private readonly onMove = (event: PointerEvent): void => this.drag.move(event.clientX, event.clientY);

	private readonly onKey = (event: KeyboardEvent): void => {
		if (event.key !== "Escape") {
			return;
		}

		this.stop();
		this.drag.cancel();
	};

	private readonly onUp = (): void => {
		this.stop();

		if (this.drag.isLifted()) {
			swallowNextClick();
		}

		void this.drag.end();
	};

	private readonly onBlur = (): void => {
		if (!this.drag.isLifted()) {
			return;
		}

		this.stop();
		this.drag.letGoForOwnWindow();
	};

	private readonly onCancel = (): void => {
		this.stop();
		this.drag.endOnPointerLost();
	};

	private stop(): void {
		window.removeEventListener("pointermove", this.onMove);
		window.removeEventListener("pointerup", this.onUp);
		window.removeEventListener("pointercancel", this.onCancel);
		window.removeEventListener("keydown", this.onKey, true);
		window.removeEventListener("blur", this.onBlur);
		window.removeEventListener("selectstart", preventSelection, true);
	}
}

function preventSelection(event: Event): void {
	event.preventDefault();
}

function swallowNextClick(): void {
	const swallow = (event: MouseEvent): void => {
		event.stopPropagation();
		event.preventDefault();
	};
	window.addEventListener("click", swallow, {
		capture: true,
		once: true,
	});
	setTimeout(() => window.removeEventListener("click", swallow, true), 0);
}
