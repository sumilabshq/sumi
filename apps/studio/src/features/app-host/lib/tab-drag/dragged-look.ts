const DEAF_DURING_DRAG = "button, [data-tabs-item]";
const POINTER_EVENTS = "pointer-events";

interface Deafened {
	readonly element: HTMLElement;
	readonly was: string;
}

export class DraggedLook {
	private readonly deafened: readonly Deafened[];
	private hiding = 0;

	constructor(
		private readonly picked: HTMLElement,
		holder: HTMLElement,
	) {
		this.deafened = [...holder.querySelectorAll<HTMLElement>(DEAF_DURING_DRAG)]
			.filter((element) => element !== picked)
			.map((element) => ({
				element,
				was: element.style.getPropertyValue(POINTER_EVENTS),
			}));
	}

	lift(): void {
		this.hiding = window.setTimeout(() => {
			this.picked.style.visibility = "hidden";
		}, 0);
		this.deafened.forEach(({ element }) => element.style.setProperty(POINTER_EVENTS, "none"));
	}

	hearAgain(): void {
		this.deafened.forEach(({ element, was }) => element.style.setProperty(POINTER_EVENTS, was));
	}

	show(): void {
		clearTimeout(this.hiding);
		this.picked.style.visibility = "";
	}
}
